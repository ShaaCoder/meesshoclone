import { supabaseAdmin } from "./lib/supabase-admin";

async function checkPolicies() {
  const { data, error } = await supabaseAdmin.rpc("get_policies", {});
  // Or just query pg_policies directly
  const { data: policies, error: pError } = await supabaseAdmin
    .from("pg_policies")
    .select("*")
    .eq("tablename", "orders");

  console.log("Policies:", policies, pError);
}

checkPolicies();
