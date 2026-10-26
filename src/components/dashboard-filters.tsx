import Link from "next/link";
import { hasActiveFilters, type Filters } from "@/lib/dashboard";
import { ui } from "@/lib/ui";

interface EntityOption {
  id: string;
  name: string;
  country: string;
}

/** Filtros do painel: formulário GET simples (sem JavaScript); o estado fica na URL. */
export function DashboardFilters({
  entities,
  filters,
}: {
  entities: EntityOption[];
  filters: Filters;
}) {
  return (
    <form method="get" action="/" className={`${ui.card} grid gap-4 sm:grid-cols-3 lg:grid-cols-6`}>
      <label className={ui.label}>
        Empresa / categoria
        <select name="entidade" defaultValue={filters.entity ?? ""} className={ui.input}>
          <option value="">Todas</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.country === "BR" ? "Brasil" : "EUA"})
            </option>
          ))}
        </select>
      </label>
      <label className={ui.label}>
        Tipo
        <select name="tipo" defaultValue={filters.kind ?? ""} className={ui.input}>
          <option value="">Empresas e pessoal</option>
          <option value="company">Só empresas</option>
          <option value="personal">Só pessoal</option>
        </select>
      </label>
      <label className={ui.label}>
        País
        <select name="pais" defaultValue={filters.country ?? ""} className={ui.input}>
          <option value="">Todos</option>
          <option value="BR">Brasil</option>
          <option value="US">EUA</option>
        </select>
      </label>
      <label className={ui.label}>
        Moeda
        <select name="moeda" defaultValue={filters.currency ?? ""} className={ui.input}>
          <option value="">BRL e USD</option>
          <option value="BRL">Só BRL</option>
          <option value="USD">Só USD</option>
        </select>
      </label>
      <label className={ui.label}>
        Situação
        <select name="situacao" defaultValue={filters.status ?? ""} className={ui.input}>
          <option value="">Todas em aberto</option>
          <option value="none">Sem pagamento/recebimento</option>
          <option value="partial">Parcialmente pagas/recebidas</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" className={ui.btn}>
          Filtrar
        </button>
        {hasActiveFilters(filters) && (
          <Link href="/" className={ui.btnSecondary}>
            Limpar
          </Link>
        )}
      </div>
    </form>
  );
}
