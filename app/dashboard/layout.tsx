import {auth} from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";


export default  async function DashBoardlayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const {has} = await auth();
    const hasPaidPlan = await has({plan: "pro"}) || await has({plan: "starter"});
    if (!hasPaidPlan) {
        redirect("/#pricing");
    }
  return <div className="min-h-screen flex flex-col">
    
    <DashboardHeader />
    {children}</div>;
}
