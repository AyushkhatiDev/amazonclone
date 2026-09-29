import { Suspense } from "react";
import OrderDetail from "./OrderDetail";

export default async function Page({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <OrderDetail id={id} />
    </Suspense>
  );
}
