"use client"

import { useEffect, useState } from "react";
import type { OrderRecord, OrderStatus } from "@/lib/orderTypes";

export default function AdminOrders(){
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    async function fetchList() {
        const key = sessionStorage.getItem("admin_key") ?? "";
        const res = await fetch ("/api/admin/list", {headers:{"x-admin-key": key}});
        if (res.ok) setOrders(await res.json());
    }
    useEffect(()=> {fetchList();}, []);

    async function setStatus (id:string, status: OrderStatus){
        const key = sessionStorage.getItem("admin_key") ?? "";
        await fetch (`/api/orders/${id}/status`, {
            method: "POST",
            headers: {"Content-Type":"application/json", "x-admin-key": key},
            body: JSON.stringify({status}),
        });
        fetchList();
    }

    return (
        <main style={{maxWidth:960, margin:"0 auto", padding: 16}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
                <h1>Orders</h1>
                <div style={{display:"flex", gap:12}}>
                    <a href="/admin/inventory" style={{color:"#111827"}}>Inventory</a>
                    <a href="/admin/flavor-requests" style={{color:"#111827"}}>Flavor Requests</a>
                </div>
            </div>
            {orders.map(o => (
                <div key={o.id} style={{border:"1px solid #e537eb", borderRadius:12, padding:12, marginTop: 8}}>
                    <div><strong>#{o.id}</strong> - {o.customer.name} - {o.status}</div>
                    <div style={{display:"flex", gap:8, marginTop:8, flexWrap:"wrap"}}>
                        {["PAID", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED", "CANCELED"].map(s=> (
                            <button key={s} onClick={() =>setStatus(o.id, s as OrderStatus)}>{s}</button>
                        ))}
                    </div>
                </div>
            ))}
        </main>
    );
}