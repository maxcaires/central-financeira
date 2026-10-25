"use server";

import { revalidatePath } from "next/cache";
import { flash, requireUser } from "@/lib/auth";

const PATH = "/configuracoes";

export async function createEntity(formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const country = String(formData.get("country") ?? "");

  if (!name) flash(PATH, "erro", "Informe o nome.");
  if (name.length > 80) flash(PATH, "erro", "O nome deve ter no máximo 80 caracteres.");
  if (kind !== "company" && kind !== "personal") flash(PATH, "erro", "Tipo inválido.");
  if (country !== "BR" && country !== "US") flash(PATH, "erro", "País inválido.");

  const { error } = await supabase.from("entities").insert({ name, kind, country });
  if (error) flash(PATH, "erro", "Não foi possível cadastrar a entidade.");

  revalidatePath(PATH);
  flash(PATH, "ok", `"${name}" cadastrada.`);
}

export async function renameEntity(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) flash(PATH, "erro", "Entidade inválida.");
  if (!name) flash(PATH, "erro", "Informe o nome.");
  if (name.length > 80) flash(PATH, "erro", "O nome deve ter no máximo 80 caracteres.");

  const { error } = await supabase.from("entities").update({ name }).eq("id", id);
  if (error) flash(PATH, "erro", "Não foi possível renomear.");

  revalidatePath(PATH);
  flash(PATH, "ok", "Nome atualizado.");
}

export async function setEntityActive(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) flash(PATH, "erro", "Entidade inválida.");

  const { error } = await supabase.from("entities").update({ active }).eq("id", id);
  if (error) flash(PATH, "erro", "Não foi possível alterar o status.");

  revalidatePath(PATH);
  flash(PATH, "ok", active ? "Entidade reativada." : "Entidade desativada.");
}
