import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { project_id, parent_id, name, type } = await req.json();

  if (!project_id || !name || (type !== "file" && type !== "folder")) {
    return NextResponse.json(
      { error: "project_id, name, and type ('file'|'folder') are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      project_id,
      parent_id: parent_id ?? null,
      name,
      type,
      content: type === "file" ? "" : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, name, content, parent_id } = await req.json();

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (content !== undefined) updates.content = content;
  if (parent_id !== undefined) updates.parent_id = parent_id;

  const { data, error } = await supabase
    .from("files")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
