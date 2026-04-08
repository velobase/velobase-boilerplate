"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  language = "markdown",
  height = "200px",
  placeholder,
  readOnly = false,
}: MonacoEditorProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const editorTheme = currentTheme === "dark" ? "vs-dark" : "vs";

  const handleEditorChange = (value: string | undefined) => {
    onChange(value ?? "");
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Editor
        height={height}
        language={language}
        theme={editorTheme}
        value={value}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          readOnly,
          padding: { top: 8, bottom: 8 },
          suggest: {
            showWords: false,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-sm text-muted-foreground">Loading editor...</p>
          </div>
        }
      />
      {placeholder && !value && (
        <div className="absolute top-2 left-14 text-sm text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}

