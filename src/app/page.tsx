import { Suspense } from "react";
import { connection } from "next/server";
import { getBonds } from "@/lib/bayse";
import BayseBondsApp from "@/components/BayseBondsApp";
import Skeleton from "@/components/Skeleton";

export const revalidate = 300;

async function Bonds() {
  await connection();
  const payload = await getBonds();
  return <BayseBondsApp initial={payload} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Bonds />
    </Suspense>
  );
}
