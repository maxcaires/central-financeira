"use server";

import { flash, requireUser } from "@/lib/auth";
import { parseAssetForm } from "@/lib/assets";
import { isUuid } from "@/lib/entries";

const LIST = "/assets";

function field(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

export async function createAsset(formData: FormData) {
  const { supabase } = await requireUser();
  const back = `${LIST}/novo`;

  const parsed = parseAssetForm(formData);
  if (!parsed.ok) flash(back, "erro", parsed.error);

  const { error } = await supabase.from("assets").insert(parsed.value);
  if (error) flash(back, "erro", "Não foi possível salvar o asset.");

  flash(LIST, "ok", "Asset adicionado.");
}

export async function updateAsset(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Asset inválido.");
  const back = `${LIST}/${id}`;

  const parsed = parseAssetForm(formData);
  if (!parsed.ok) flash(back, "erro", parsed.error);

  const { data, error } = await supabase.from("assets").update(parsed.value).eq("id", id).select("id");
  if (error) flash(back, "erro", "Não foi possível salvar as alterações.");
  if (!data || data.length === 0) flash(LIST, "erro", "Asset não encontrado.");

  flash(back, "ok", "Alterações salvas.");
}

export async function deleteAsset(formData: FormData) {
  const { supabase } = await requireUser();

  const id = field(formData, "id");
  if (!isUuid(id)) flash(LIST, "erro", "Asset inválido.");
  const back = `${LIST}/${id}`;

  // Segunda confirmação no servidor: o formulário precisa trazer a marca explícita.
  if (field(formData, "confirm") !== "sim") flash(back, "erro", "Confirme a remoção para continuar.");

  const { data, error } = await supabase.from("assets").delete().eq("id", id).select("id");
  if (error) flash(back, "erro", "Não foi possível remover o asset.");
  if (!data || data.length === 0) flash(LIST, "erro", "Asset não encontrado.");

  flash(LIST, "ok", "Asset removido.");
}
