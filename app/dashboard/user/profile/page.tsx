import { getSupabaseServer } from "@/lib/supabase-server";
import { updateProfile } from "@/app/actions/users";

export default async function ProfilePage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not logged in</div>;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-6">My Profile</h1>

      <form action={updateProfile} className="space-y-4">
        
        {/* NAME */}
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            name="name"
            defaultValue={profile?.name || ""}
            placeholder="Enter your name"
            className="border p-2 w-full mt-1"
          />
        </div>

        {/* EMAIL (READ ONLY) */}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            value={user.email || ""}
            disabled
            className="border p-2 w-full mt-1 bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* PHONE */}
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            name="phone"
            defaultValue={profile?.phone || ""}
            placeholder="Enter phone number"
            className="border p-2 w-full mt-1"
          />
        </div>

        <button className="bg-black text-white px-4 py-2 w-full">
          Update Profile
        </button>
      </form>
    </div>
  );
}