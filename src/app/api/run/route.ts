import { NextRequest, NextResponse } from "next/server";
import { executeCode } from "@/lib/executor";
import { getLangConfig } from "@/lib/languageMap";

export async function POST(req: NextRequest) {
  const { filename, content, stdin } = await req.json();

  if (!filename || content === undefined) {
    return NextResponse.json({ error: "filename and content are required" }, { status: 400 });
  }

  const lang = getLangConfig(filename);
  if (!lang) {
    return NextResponse.json({ error: `Unsupported file type: ${filename}` }, { status: 400 });
  }

  try {
    if (lang.runner === "preview") {
      return NextResponse.json({
        stdout: "",
        stderr: "",
        exitCode: 0,
        status: "Preview available",
        time: null,
        memory: null,
      });
    }

    const result = await executeCode(
      lang.runner,
      content,
      typeof stdin === "string" ? stdin : ""
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Execution failed" },
      { status: 502 }
    );
  }
}
