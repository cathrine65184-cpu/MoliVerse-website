import { Shell } from "@/components/universe/Shell";
import PublicCatalog from "@/components/platform/PublicCatalog";
export default function Page() {
  return (
    <Shell>
      <section className="pv">
        <PublicCatalog profile />
      </section>
    </Shell>
  );
}
