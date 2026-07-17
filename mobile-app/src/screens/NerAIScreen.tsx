import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import Markdown from "react-native-markdown-display";

import { ApiError, getChatHistory, sendChatMessage, type ChatMessage } from "../api/client";
import { useSessionStore } from "../store/sessionStore";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

// Assistant replies come from the AI Coach as markdown (lists, bold, etc.) —
// styled to match the bubble's text color, since react-native-markdown-display
// renders each block as its own RN Text/View rather than one inline node.
const markdownStyles = {
  body: { ...typography.body, fontSize: 14, color: colors.neutral },
  strong: { fontFamily: "Poppins_600SemiBold" as const },
  bullet_list: { marginVertical: 2 },
  ordered_list: { marginVertical: 2 },
  list_item: { marginVertical: 2, flexDirection: "row" as const },
  paragraph: { marginTop: 0, marginBottom: 8 },
  code_inline: {
    backgroundColor: `${colors.neutral}1A`,
    fontFamily: "Poppins_400Regular" as const,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: `${colors.neutral}1A`,
    fontFamily: "Poppins_400Regular" as const,
    borderRadius: 8,
    padding: 8,
  },
  link: { color: colors.secondary },
};

export function NerAIScreen() {
  const phone = useSessionStore((state) => state.phone);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!phone) return;
    getChatHistory(phone)
      .then(setMessages)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? "Gagal memuat riwayat obrolan."
            : "Koneksi terputus."
        );
      })
      .finally(() => setLoadingHistory(false));
  }, [phone]);

  const handleSend = async () => {
    if (!inputText.trim() || !phone || sending) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(), // temporary id
      phone,
      role: "user",
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setSending(true);

    try {
      const response = await sendChatMessage(phone, userMessage.content);
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(), // temporary id
        phone,
        role: "assistant",
        content: response.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
      >
        <View className="border-b border-slate-200 px-6 py-4">
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            NerAI Coach
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Tanya seputar keuangan, cicilan, atau hukum pinjaman.
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16, gap: 12, paddingBottom: 100 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {loadingHistory ? (
            <ActivityIndicator color={colors.primary} />
          ) : error && messages.length === 0 ? (
            <Text className="text-center font-body text-neutral" style={{ color: colors.error }}>
              {error}
            </Text>
          ) : messages.length === 0 ? (
            <Text className="text-center font-body text-neutral" style={{ opacity: 0.5 }}>
              Belum ada obrolan. Coba tanya sesuatu!
            </Text>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <View
                  key={msg.id || i}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser ? "self-end" : "self-start"
                  }`}
                  style={{
                    backgroundColor: isUser ? colors.primary : `${colors.primary}1A`,
                    borderBottomRightRadius: isUser ? 4 : 16,
                    borderBottomLeftRadius: !isUser ? 4 : 16,
                  }}
                >
                  {isUser ? (
                    <Text className="font-body text-sm" style={{ color: "white" }}>
                      {msg.content}
                    </Text>
                  ) : (
                    <Markdown style={markdownStyles}>{msg.content}</Markdown>
                  )}
                </View>
              );
            })
          )}
          {sending && (
            <View
              className="self-start max-w-[85%] rounded-2xl px-4 py-3"
              style={{
                backgroundColor: `${colors.primary}1A`,
                borderBottomLeftRadius: 4,
              }}
            >
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          )}
        </ScrollView>

        <View className="border-t border-slate-200 px-4 py-3 flex-row items-center bg-white">
          <TextInput
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 font-body mr-2"
            style={{ minHeight: 44, maxHeight: 100, color: colors.neutral }}
            placeholder="Tanya Coach NerAI..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            className="items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              backgroundColor: inputText.trim() && !sending ? colors.primary : "#CBD5E1",
            }}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
