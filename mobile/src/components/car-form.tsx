import { Feather } from "@expo/vector-icons";
import type { CarCatalog, PlanPreview } from "@revlog/api";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckList, ChoiceField, Field, SelectField } from "@/components/fields";
import { Body, Button, FormError, Heading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { choosePhoto, type ChosenPhoto } from "@/lib/photos";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export type CarValues = {
  year: string;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  vin: string;
  currentMileage: string;
  builtMonth: string;
  builtYear: string;
};

export type DrivingAnswers = {
  driving: string;
  roads: string;
  conditions: string[];
  caution: string;
};

export const blankCar = (): CarValues => ({
  year: "",
  make: "",
  model: "",
  trim: "",
  nickname: "",
  vin: "",
  currentMileage: "",
  builtMonth: "",
  builtYear: "",
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

const NOT_LISTED = "__not-listed";
const notListed = { value: NOT_LISTED, label: "Not listed" };

const required = (message: string) => (value: string) => (value.trim() ? null : message);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

type Decoded = { year: string; make: string; model: string; trim: string };

function sentence(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")}${list.length > 2 ? "," : ""} and ${list.at(-1)}`;
}

// The reminders the car will start with. Updates as the questions are answered.
function PlanList({ plan }: { plan: PlanPreview }) {
  return (
    <View style={styles.section}>
      <Heading>Your service reminders</Heading>
      <Body style={styles.hint}>
        {plan.source === "make"
          ? `Based on ${plan.makeName}'s typical schedule${
              plan.adjustedFor.length > 0 ? `, adjusted for ${sentence(plan.adjustedFor)}` : ""
            }.`
          : "Revlog has no schedule for this car, so these are general intervals for most cars. Change them to match your owner's manual."}
      </Body>
      <View style={styles.plan}>
        {plan.items.map((item) => (
          <View key={item.service} style={styles.planRow}>
            <Text style={styles.planTask}>{item.task}</Text>
            <View style={styles.planInterval}>
              <Text style={styles.planValue}>{item.interval}</Text>
              {item.usual && <Text style={styles.planUsual}>Usually {item.usual}</Text>}
            </View>
          </View>
        ))}
      </View>
      <Body style={styles.hint}>
        On the car&apos;s page, log when each was last done or mark it never done. You can add more
        there too, like tire rotations.
      </Body>
    </View>
  );
}

export function CarForm({
  initial,
  submitLabel,
  isNew = false,
  canUpload = false,
  onSave,
  children,
}: {
  initial: CarValues;
  submitLabel: string;
  // Adding a car picks the make and model from lists and previews its service
  // plan. Editing keeps plain text, since older cars may not be listed.
  isNew?: boolean;
  canUpload?: boolean;
  onSave: (
    values: CarValues,
    answers: DrivingAnswers | null,
    photo: ChosenPhoto | null,
  ) => Promise<void>;
  children?: React.ReactNode;
}) {
  const catalog = useApi<CarCatalog>(isNew ? "/car-catalog" : null);
  const [values, setValues] = useState(initial);
  const [makeListed, setMakeListed] = useState(true);
  const [modelListed, setModelListed] = useState(true);
  const [answers, setAnswers] = useState<DrivingAnswers | null>(null);
  const [fetchedPlan, setPlan] = useState<PlanPreview | null>(null);
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [vinNote, setVinNote] = useState<string | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const set = (key: keyof CarValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  // Lists only when the catalog loaded; otherwise the names are typed in.
  const makes = isNew ? catalog.data?.makes : undefined;
  const make = makes?.find((m) => m.name === values.make);
  const picked = answers ?? catalog.data?.defaults ?? null;
  const { year, make: makeName, model } = values;
  const carChosen = isNew && makeName.trim() !== "" && model.trim() !== "";

  // The plan comes from the server, which builds the same one again on save.
  useEffect(() => {
    if (!carChosen) return;
    let current = true;
    const timer = setTimeout(() => {
      api<PlanPreview>("/service-plan", {
        method: "POST",
        body: { year, make: makeName, model, ...picked },
      })
        .then((next) => current && setPlan(next))
        .catch(() => current && setPlan(null));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [carChosen, year, makeName, model, picked]);
  // A plan fetched for an earlier pick doesn't outlive it.
  const plan = carChosen ? fetchedPlan : null;

  const lookUp = async () => {
    setLooking(true);
    setVinNote(null);
    setVinError(null);
    try {
      const car = await api<Decoded>("/vin", { method: "POST", body: { vin: values.vin } });
      const found = Object.fromEntries(Object.entries(car).filter(([, v]) => v));
      // Match what the VIN gave onto the lists, or keep it as typed names.
      const listedMake = makes?.find((m) => same(m.name, car.make));
      const listedModel = listedMake?.models.find((m) => same(m, car.model));
      setMakeListed(!!listedMake);
      setModelListed(!!listedModel);
      setValues((v) => ({
        ...v,
        ...found,
        make: listedMake?.name ?? car.make ?? v.make,
        model: listedModel ?? car.model ?? v.model,
      }));
      const name = [car.year, car.make, car.model, car.trim].filter(Boolean).join(" ");
      setVinNote(`Found a ${name}. Check the details below.`);
    } catch (err) {
      setVinError(errorMessage(err));
    } finally {
      setLooking(false);
    }
  };

  const addPhoto = async () => {
    if (!canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    try {
      const chosen = await choosePhoto();
      if (chosen) setPhoto(chosen);
    } catch (err) {
      Alert.alert("Photo not added", errorMessage(err));
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(values, plan?.source === "make" ? picked : null, photo);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      {isNew && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photo ? "Change the photo" : "Add a photo of the car"}
          style={({ pressed }) => [styles.photo, pressed && styles.photoPressed]}
          onPress={addPhoto}
        >
          {photo ? (
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <Feather name="camera" size={24} color={colors.amber} />
              <Text style={styles.photoLabel}>Add a photo (optional)</Text>
            </>
          )}
        </Pressable>
      )}

      <Field
        label="VIN (optional)"
        value={values.vin}
        onChangeText={set("vin")}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
      />
      <Button label="Look up VIN" kind="secondary" busy={looking} onPress={lookUp} />
      {vinNote ? (
        <Body style={styles.note}>{vinNote}</Body>
      ) : (
        !vinError && (
          <Body style={styles.hint}>
            17 characters, on the driver&apos;s side dash or door jamb. Look up fills in the car for
            you.
          </Body>
        )
      )}
      <FormError message={vinError} />

      <Field
        label="Year"
        value={values.year}
        onChangeText={set("year")}
        keyboardType="number-pad"
        maxLength={4}
        validate={required("Enter the year, like 2014.")}
      />
      {makes && makeListed ? (
        <SelectField
          label="Make"
          placeholder="Choose a make"
          value={values.make}
          options={[...makes.map((m) => ({ value: m.name, label: m.name })), notListed]}
          onChange={(next) => {
            const listed = next !== NOT_LISTED;
            setMakeListed(listed);
            setModelListed(listed);
            setValues((v) => ({ ...v, make: listed ? next : "", model: "" }));
          }}
        />
      ) : (
        <Field
          label="Make"
          value={values.make}
          onChangeText={set("make")}
          maxLength={50}
          validate={required("Enter the make, like Honda.")}
        />
      )}
      {make && modelListed ? (
        <SelectField
          label="Model"
          placeholder="Choose a model"
          value={values.model}
          options={[...make.models.map((m) => ({ value: m, label: m })), notListed]}
          onChange={(next) => {
            setModelListed(next !== NOT_LISTED);
            set("model")(next === NOT_LISTED ? "" : next);
          }}
        />
      ) : (
        <Field
          label="Model"
          value={values.model}
          onChangeText={set("model")}
          maxLength={50}
          validate={required("Enter the model, like Civic.")}
        />
      )}
      {makes && (!makeListed || !modelListed) && (
        <Button
          label="Choose from the list"
          kind="secondary"
          onPress={() => {
            setMakeListed(true);
            setModelListed(true);
            setValues((v) => ({ ...v, make: "", model: "" }));
          }}
        />
      )}
      <Field label="Trim (optional)" value={values.trim} onChangeText={set("trim")} maxLength={100} />
      <Field
        label="Nickname (optional)"
        value={values.nickname}
        onChangeText={set("nickname")}
        maxLength={100}
      />
      <Field
        label="Current mileage"
        value={values.currentMileage}
        onChangeText={set("currentMileage")}
        keyboardType="number-pad"
        validate={required("Enter the mileage on the odometer.")}
      />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <SelectField
            label="Built in (optional)"
            placeholder="Month"
            value={values.builtMonth}
            options={[{ value: "", label: "Not set" }, ...MONTHS]}
            onChange={set("builtMonth")}
          />
        </View>
        <View style={styles.pairItem}>
          <Field
            label="Build year"
            value={values.builtYear}
            onChangeText={set("builtYear")}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      <Body style={styles.hint}>The build date is on the door jamb sticker, like MFD 06/19.</Body>

      {plan?.source === "make" && catalog.data && picked && (
        <View style={styles.section}>
          <Heading>How it&apos;s driven</Heading>
          <ChoiceField
            label="How hard is it driven?"
            value={picked.driving}
            options={catalog.data.driving}
            onChange={(driving) => setAnswers({ ...picked, driving })}
          />
          <ChoiceField
            label="Where are most of its miles?"
            value={picked.roads}
            options={catalog.data.roads}
            onChange={(roads) => setAnswers({ ...picked, roads })}
          />
          <CheckList
            label="Do any of these apply? (optional)"
            values={picked.conditions}
            options={catalog.data.conditions}
            onChange={(conditions) => setAnswers({ ...picked, conditions })}
          />
          <ChoiceField
            label="How careful do you want to be?"
            value={picked.caution}
            options={catalog.data.caution}
            onChange={(caution) => setAnswers({ ...picked, caution })}
          />
        </View>
      )}
      {plan && <PlanList plan={plan} />}
      {isNew && !plan && (
        <Body style={styles.hint}>
          Revlog starts the car with a service schedule you can change.
        </Body>
      )}

      <FormError message={error} />
      <Button label={submitLabel} busy={saving} onPress={save} />
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: space.md },
  pairItem: { flex: 1 },
  note: { color: colors.done, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  photo: {
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.panel,
  },
  photoPressed: { backgroundColor: colors.graphite },
  photoLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
  section: { gap: space.md, marginTop: space.sm },
  plan: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  planTask: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  planInterval: { alignItems: "flex-end" },
  planValue: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 14, lineHeight: 20 },
  planUsual: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
