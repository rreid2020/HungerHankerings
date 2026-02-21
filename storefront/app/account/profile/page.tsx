import { redirect } from "next/navigation"
import { getAuthUser } from "../../../lib/auth"
import ProfileForm from "./ProfileForm"

export default async function ProfilePage() {
  const { user, hasToken } = await getAuthUser()

  if (!hasToken) {
    redirect("/login?redirect=/account/profile")
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Couldn't load your account.</p>
        <p className="mt-1 text-sm">Please refresh the page or try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account information
        </p>
      </div>

      <ProfileForm
        initialFirstName={user.firstName}
        initialLastName={user.lastName}
        email={user.email}
        isConfirmed={user.isConfirmed}
      />
    </div>
  )
}
