import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useChatColors } from "@/hooks/useChatColors";
import type { ChatPoll } from "@/services/chatService";

export function ChatPollBubble({
  poll,
  yourUserId,
  resolveName,
  onVote,
  onRetract,
  disabled,
}: {
  poll: ChatPoll;
  yourUserId: string | undefined;
  resolveName: (userId: string) => string;
  onVote: (pollOptionId: string) => void;
  onRetract: () => void;
  disabled?: boolean;
}) {
  const colors = useChatColors();
  const yourOptionId = yourUserId
    ? poll.options.find((option) => option.voterIds.includes(yourUserId))?.id
    : undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.questionRow}>
        <Ionicons name="bar-chart" size={16} color={colors.primary} />
        <Text style={[styles.question, { color: colors.foreground }]}>
          {poll.question}
        </Text>
      </View>
      {poll.options.map((option) => {
        const pct =
          poll.totalVotes > 0
            ? Math.round((option.voterIds.length / poll.totalVotes) * 100)
            : 0;
        const mine = option.id === yourOptionId;
        return (
          <Pressable
            key={option.id}
            disabled={disabled}
            onPress={() => (mine ? onRetract() : onVote(option.id))}
            accessibilityRole="button"
            accessibilityLabel={`${option.text}, ${option.voterIds.length} vote${
              option.voterIds.length === 1 ? "" : "s"
            }${mine ? ", your vote" : ""}`}
            style={[
              styles.option,
              { borderColor: mine ? colors.primary : colors.border },
            ]}
          >
            <View
              style={[
                styles.optionFill,
                {
                  width: `${pct}%`,
                  backgroundColor: mine ? `${colors.primary}26` : colors.secondary,
                },
              ]}
            />
            <View style={styles.optionRow}>
              {mine ? (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              ) : null}
              <Text numberOfLines={2} style={[styles.optionText, { color: colors.foreground }]}>
                {option.text}
              </Text>
              <Text style={[styles.optionPct, { color: colors.mutedForeground }]}>
                {pct}%
              </Text>
            </View>
            {option.voterIds.length > 0 ? (
              <Text numberOfLines={1} style={[styles.voters, { color: colors.mutedForeground }]}>
                {option.voterIds
                  .map((id) => (id === yourUserId ? "You" : resolveName(id)))
                  .join(", ")}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      <Text style={[styles.total, { color: colors.mutedForeground }]}>
        {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"} · Tap an option to vote
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    minWidth: 220,
    maxWidth: 280,
    gap: 7,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  option: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  optionPct: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
  },
  voters: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  total: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
