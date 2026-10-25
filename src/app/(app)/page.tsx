import Link from "next/link";
import { ui } from "@/lib/ui";

export default function PainelPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={ui.h1}>Painel</h1>
      <div className={ui.card}>
        <p className={ui.muted}>
          O painel com vencimentos de hoje, vencidos e próximos 7 dias será criado na Etapa 4.
          Por enquanto, cadastre suas entidades e lançamentos:
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm">
          <li>
            <Link href="/configuracoes" className="underline">
              Configurações
            </Link>{" "}
            — empresas e categorias pessoais
          </li>
          <li>
            <Link href="/pagar" className="underline">
              Contas a pagar
            </Link>
          </li>
          <li>
            <Link href="/receber" className="underline">
              Contas a receber
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
