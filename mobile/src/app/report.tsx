import type { CommunityOptions } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Field, SelectField } from "@/components/fields";
import { Body, Button, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function Report() {
  const { kind, targetId, userId, username } = useLocalSearchParams<{
    kind: string;
    targetId: string;
    userId: string;
    username: string;
  }>();
  const options = useApi<CommunityOptions>("/community/options");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // A reported post leaves its own screen too; a comment leaves only the thread.
  const done = () => (kind === "comment" ? router.back() : router.dismissAll());

  if (sent) {
    return (
      <Screen>
        <Body>Report sent. A moderator reviews every report, and this is hidden from you now.</Body>
        <Button
          label={`Block @${username}`}
          kind="danger"
          onPress={async () => {
            try {
              await api("/community/blocks", { method: "POST", body: { userId } });
              done();
            } catch (err) {
              Alert.alert("Account not blocked", errorMessage(err));
            }
          }}
        />
        <Button label="Done" onPress={done} />
      </Screen>
    );
  }

  if (!options.data) {
    return options.error ? (
      <LoadFailed message={options.error} onRetry={options.reload} />
    ) : (
      <Loading />
    );
  }

  const send = async () => {
    if (!reason) {
      setReasonError("Pick a reason for the report.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api("/community/reports", {
        method: "POST",
        body: { kind, targetId, reason, details },
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <SelectField
        label="Reason"
        value={reason}
        options={options.data.reasons}
        error={reasonError}
        onChange={(value) => {
          setReasonError(null);
          setReason(value);
        }}
      />
      <Field
        label="Details (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={1000}
      />
      <FormError message={error} />
      <Button label="Send report" busy={sending} onPress={send} />
    </Screen>
  );
}
