export type OrderStatus = 
| "AWAITING_PAYMENT"
| "PAID"
| "IN_PROGRESS"
| "READY_FOR_PICKUP"
| "COMPLETED"
| "CANCELED";

export type OrderItem = {id: string; name: string; price: number; qty: number};

export type OrderRecord = {
    id: string;
    createdAt: string;
    status: OrderStatus;
    customer: {
        name: string;
        email: string;
        phone?: string;
        notes: string;
        venmoUser?: string;
        venmoNote?: string;
    };
    items: OrderItem[];
    totals: {subtotal: number; tax: number; total: number};
};