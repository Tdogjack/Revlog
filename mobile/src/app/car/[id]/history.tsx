import type {
  CarDetail,
  DraftRecord,
  SaveHistoryResult,
  ScannedHistory,
  ServiceType,
} from "@revlog/api";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAiConsent } from "@/components/ai-consent";
import { DateField, Field, SelectField } from "@/components/fields";
import {
  Body,
  Button,
  EmptyState,
  FormError,
  ListGroup,
  ListRow,
  LoadFailed,
  Loading,
  Screen,
} from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDate, formatMoney, today } from "@/lib/format";
import { choosePhoto, fileForm, photoForm } from "@/lib/photos";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

// The server's PDF limit, checked here so a large file isn't sent for nothing.
const MAX_PDF_BYTES = 3.5 * 1024 * 1024;
const MAX_SHEET_BYTES = 2 * 1024 * 1024;
const SHEET_TYPES = [
  "text/csv",
  "text/comma-separated-values",
  "text/tab-separated-values",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

type Row = DraftRecord & {
  key: number;
  include: boolean;
  duplicate: boolean;
  // The scanned photo, attached to this source's first saved record.
  photoUri?: string;
  problem?: string;
};

const matchKey = (r: { servicedOn: string; title: string }) =>
  `${r.servicedOn}|${r.title.trim().toLowerCase()}`;

function RowCard({
  row,
  types,
  onChange,
}: {
  row: Row;
  types: ServiceType[];
  onChange: (change: Partial<Row>) => void;
}) {
  const [open, setOpen] = useState(false);
  const facts = [
    row.servicedOn ? formatDate(row.servicedOn) : null,
    row.mileage ? `${row.mileage} mi` : null,
    Number(row.cost) ? formatMoney(row.cost) : null,
  ].filter(Boolean);
  const problem = row.problem ?? (row.servicedOn ? null : "Add the date");
  const set = (key: keyof DraftRecord) => (value: string) =>
    onChange({ [key]: value, problem: undefined });

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Edit ${row.title}`}
          style={styles.rowMain}
          onPress={() => setOpen(!open)}
        >
          <Text style={styles.rowTitle}>{row.title}</Text>
          {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
          {row.duplicate && <Text style={styles.rowDetail}>Already in the service log</Text>}
          {row.include && problem && <Text style={styles.problem}>{problem}</Text>}
        </Pressable>
        <Switch
          accessibilityLabel={`Keep ${row.title}`}
          value={row.include}
          trackColor={{ true: colors.amber, false: colors.graphite }}
          onValueChange={(include) => onChange({ include })}
        />
      </View>
      {open && (
        <View style={styles.fields}>
          <SelectField
            label="Service"
            value={row.category}
            options={types}
            onChange={set("category")}
          />
          <Field label="Title" value={row.title} onChangeText={set("title")} maxLength={100} />
          <DateField
            label="Date"
            value={row.servicedOn || today()}
            onChange={set("servicedOn")}
          />
          <Field
            label="Mileage (optional)"
            value={row.mileage}
            onChangeText={set("mileage")}
            keyboardType="number-pad"
          />
          <Field
            label="Cost (optional)"
            value={row.cost}
            onChangeText={set("cost")}
            keyboardType="decimal-pad"
          />
          <Field label="Shop (optional)" value={row.shop} onChangeText={set("shop")} maxLength={100} />
          <Field
            label="Notes (optional)"
            value={row.notes}
            onChangeText={set("notes")}
            multiline
            maxLength={2000}
          />
          {row.parts.length > 0 && (
            <Text style={styles.rowDetail}>
              {row.parts.length} {row.parts.length === 1 ? "part" : "parts"} saved with this record
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function ImportHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = useApi<CarDetail>(`/vehicles/${id}`);
  const types = useApi<ServiceType[]>("/service-types");
  const consent = useAiConsent();
  const [rows, setRows] = useState<Row[]>([]);
  const [scanning, setScanning] = useState<"photo" | "pdf" | "sheet" | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!car.data || !types.data) {
    const message = car.error ?? types.error;
    return message ? <LoadFailed message={message} onRetry={car.reload} /> : <Loading />;
  }
  const { records, canUpload } = car.data;

  const addScan = (scan: ScannedHistory, photoUri?: string) => {
    setNotice(scan.unreadable);
    setRows((current) => {
      const seen = new Set([...records, ...current].map(matchKey));
      const added = scan.entries.map((entry, i) => {
        const duplicate = !!entry.servicedOn && seen.has(matchKey(entry));
        seen.add(matchKey(entry));
        const key = current.length + i;
        return { ...entry, key, include: !duplicate, duplicate, photoUri };
      });
      return [...current, ...added];
    });
  };

  const read = async (
    kind: "photo" | "pdf" | "sheet",
    form: FormData,
    photoUri?: string,
  ) => {
    setScanning(kind);
    try {
      const path = kind === "sheet" ? "/scans/sheet" : "/scans/history";
      const scan = await api<ScannedHistory>(path, { method: "POST", form });
      addScan(scan, photoUri);
      if (scan.entries.length === 0 && !scan.unreadable) {
        setNotice("No services were found in that file.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(null);
    }
  };

  const ready = async () => {
    setError(null);
    if (!canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to scan files. Resend the link from Account.");
      return false;
    }
    try {
      return await consent.ensure();
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const scanPhoto = async () => {
    if (!(await ready())) return;
    try {
      const photo = await choosePhoto();
      if (!photo) return;
      await read("photo", photoForm(photo.uri, {}, "file"), photo.uri);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const scanPdf = async () => {
    if (!(await ready())) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const [file] = result.assets;
    if ((file.size ?? 0) > MAX_PDF_BYTES) {
      setError("That PDF is over 3.5 MB. Split it into smaller files and add those.");
      return;
    }
    await read("pdf", fileForm(file.uri, "application/pdf", file.name));
  };

  // Columns are matched on the server, so a spreadsheet needs no AI scan
  // unless its layout can't be followed.
  const addSheet = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: SHEET_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const [file] = result.assets;
    if ((file.size ?? 0) > MAX_SHEET_BYTES) {
      setError("That file is over 2 MB. Split it into smaller files and add those.");
      return;
    }
    await read("sheet", fileForm(file.uri, file.mimeType ?? "text/csv", file.name));
  };

  const kept = rows.filter((r) => r.include);

  const save = async () => {
    setError(null);
    const undated = kept.find((r) => !r.servicedOn);
    if (undated) {
      setError(`Add the date for ${undated.title}, or turn it off.`);
      return;
    }
    setSaving(true);
    try {
      const body = kept.map(({ key, category, title, servicedOn, mileage, cost, shop, notes, parts }) => ({
        key,
        category,
        title,
        servicedOn,
        mileage,
        cost,
        shop,
        notes,
        parts,
      }));
      const result = await api<SaveHistoryResult>(`/vehicles/${id}/service/history`, {
        method: "POST",
        body: { rows: JSON.stringify(body) },
      });
      if ("saved" in result) await attachPhotos(result.saved);
      router.back();
    } catch (err) {
      setSaving(false);
      setError(errorMessage(err));
      const rowKey = err instanceof ApiError ? (err.data as { rowKey?: number })?.rowKey : undefined;
      if (rowKey != null) {
        const message = errorMessage(err);
        setRows((list) => list.map((r) => (r.key === rowKey ? { ...r, problem: message } : r)));
      }
    }
  };

  // Each scanned photo goes on the first record kept from it. The records are
  // saved by now, so a failed photo doesn't lose them.
  const attachPhotos = async (saved: { key: number; id: string }[]) => {
    let failed = 0;
    for (const uri of new Set(kept.flatMap((r) => r.photoUri ?? []))) {
      const first = kept.find((r) => r.photoUri === uri);
      const record = saved.find((s) => s.key === first?.key);
      if (!record) continue;
      await api(`/vehicles/${id}/photos`, {
        method: "POST",
        form: photoForm(uri, { kind: "record", targetId: record.id }),
      }).catch(() => failed++);
    }
    if (failed > 0) Alert.alert("Records saved", `${failed} of your photos didn't upload.`);
  };

  const update = (key: number, change: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));

  return (
    <Screen>
      <Body style={styles.muted}>
        Add old receipts, a service history PDF, or a spreadsheet. You check every record before
        anything is saved. Photos and PDFs are read by Anthropic&apos;s AI.
      </Body>
      <ListGroup>
        <ListRow
          icon="camera"
          label={scanning === "photo" ? "Reading the photo" : "Scan a photo"}
          busy={scanning === "photo"}
          onPress={scanning ? () => {} : scanPhoto}
        />
        <ListRow
          icon="file-text"
          label={scanning === "pdf" ? "Reading the PDF" : "Scan a PDF"}
          busy={scanning === "pdf"}
          onPress={scanning ? () => {} : scanPdf}
        />
        <ListRow
          icon="grid"
          label={scanning === "sheet" ? "Reading the spreadsheet" : "Add a spreadsheet (.csv or .xlsx)"}
          busy={scanning === "sheet"}
          onPress={scanning ? () => {} : addSheet}
        />
      </ListGroup>
      {notice && <Body style={styles.muted}>{notice}</Body>}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing added yet"
          body="Records from your files show up here to check, one by one."
        />
      ) : (
        <>
          <View style={styles.list}>
            {rows.map((row) => (
              <RowCard
                key={row.key}
                row={row}
                types={types.data ?? []}
                onChange={(change) => update(row.key, change)}
              />
            ))}
          </View>
          <FormError message={error} />
          <Button
            label={`Save ${kept.length} ${kept.length === 1 ? "record" : "records"}`}
            busy={saving}
            onPress={save}
          />
        </>
      )}
      {rows.length === 0 && <FormError message={error} />}
      {consent.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.steel },
  list: { gap: space.sm },
  row: { padding: space.lg, gap: space.md, borderRadius: radius.lg, backgroundColor: colors.panel },
  rowHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowMain: { flex: 1, gap: 2, minHeight: 44, justifyContent: "center" },
  rowTitle: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  rowDetail: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  problem: { color: colors.overdue, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  fields: { gap: space.md },
});
