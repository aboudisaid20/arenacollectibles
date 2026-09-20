import { OrdersTable } from "@/components/admin/OrdersTable";
import { listOrders } from "@/lib/store";

export default async function AdminOrdersPage() {
  const orders = listOrders();

  return (
    <div className="container-page py-10 md:py-14">
      <OrdersTable orders={orders} />
    </div>
  );
}
