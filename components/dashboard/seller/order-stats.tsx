import {
  CheckCircle2,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

interface Props {
  items: any[];
}

export default function OrderStats({
  items,
}: Props) {
  const stats = {
    total: items.length,

    processing: items.filter(
      (i: any) =>
        i.status === "processing" ||
        i.status === "accepted"
    ).length,

    shipped: items.filter(
      (i: any) =>
        i.status === "shipped" ||
        i.status === "out_for_delivery"
    ).length,

    delivered: items.filter(
      (i: any) =>
        i.status === "delivered"
    ).length,

    returns: items.filter(
      (i: any) =>
        i.status === "returned" ||
        i.status === "return_requested"
    ).length,

    cancelled: items.filter(
      (i: any) =>
        i.status === "cancelled"
    ).length,
  };

  const cards = [
    {
      label: "Total Orders",
      value: stats.total,
      icon: ShoppingBag,
      color:
        "bg-zinc-900 border-zinc-800 text-white",
    },

    {
      label: "Processing",
      value: stats.processing,
      icon: Package,
      color:
        "bg-blue-500/10 border-blue-500/20 text-blue-400",
    },

    {
      label: "Shipped",
      value: stats.shipped,
      icon: Truck,
      color:
        "bg-purple-500/10 border-purple-500/20 text-purple-400",
    },

    {
      label: "Delivered",
      value: stats.delivered,
      icon: CheckCircle2,
      color:
        "bg-green-500/10 border-green-500/20 text-green-400",
    },

    {
      label: "Returns",
      value: stats.returns,
      icon: RotateCcw,
      color:
        "bg-orange-500/10 border-orange-500/20 text-orange-400",
    },

    {
      label: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
      color:
        "bg-red-500/10 border-red-500/20 text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`border rounded-3xl p-5 ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-70">
                  {card.label}
                </p>

                <h3 className="text-3xl font-black mt-2">
                  {card.value}
                </h3>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}