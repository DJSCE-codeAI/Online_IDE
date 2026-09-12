import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildTree } from "@/lib/types";

// The file tree changes on every create/rename/delete/save — never cache it.
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 404 });

  const { data: files, error: filesError } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", id);

  if (filesError) return NextResponse.json({ error: filesError.message }, { status: 500 });

  return NextResponse.json({ project, tree: buildTree(files) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
