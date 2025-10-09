import type { OrderRecord } from "./orderTypes";

//TODO: replace with resend/postmark
export async function notifyNewOrder(order: OrderRecord) {
    //TODO: send email to bakery + customer
    console.log("[notify] new order", order.id);
}

export async function notifyStatusChange(order: OrderRecord) {
    //TODO: email customer about status update
    console.log("[notify] status change", order.id, order.status);
}