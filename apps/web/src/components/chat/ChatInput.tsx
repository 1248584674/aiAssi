// ── 聊天输入框（含语音输入）— Zapier 风格 ──
import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "../../stores/chat-store.js";

export default function ChatInput() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { sendMessage, isSending, currentSessionId } = useChatStore();

  // 自动调整高度
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || isSending || !currentSessionId) return;
    const msg = text.trim();
    setText("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 语音识别 ──
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音输入，请使用 Chrome");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.error("语音识别错误:", event.error);
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  // 无会话
  if (!currentSessionId) {
    return (
      <div className="border-t border-mute bg-canvas px-6 py-4">
        <p className="text-center text-xs text-mute">点击左侧 + 创建新会话开始</p>
      </div>
    );
  }

  return (
    <div className="border-t border-mute bg-canvas px-3 md:px-4 py-2 md:py-3">
      <div className="mx-auto flex max-w-2xl items-end gap-2 md:gap-3">
        {/* 语音按钮 */}
        <button
          onClick={toggleVoice}
          disabled={isSending}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50 ${
            listening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-canvas-soft text-body-mid hover:text-ink border border-mute"
          }`}
          title={listening ? "点击停止" : "语音输入"}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="5.5" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3.5 6.5a4 4 0 008 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M7.5 11v2.5M5.5 13.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "正在聆听..." : "输入消息，Enter 发送，Shift+Enter 换行..."}
          rows={1}
          disabled={isSending}
          className={`flex-1 resize-none rounded-xl border bg-canvas px-4 py-2.5 text-sm outline-none transition disabled:opacity-50 ${
            listening
              ? "border-red-400 ring-1 ring-red-400/30 placeholder-red-400"
              : "border-ink/20 text-ink placeholder-mute focus:border-primary focus:ring-1 focus:ring-primary/30"
          }`}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-mute disabled:text-white/60"
        >
          {isSending ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 10" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 5-10 5 2-5-2-5z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-mute">
        AI 企业效率助手 · 支持日程管理、费用报销、任务待办
      </p>
    </div>
  );
}