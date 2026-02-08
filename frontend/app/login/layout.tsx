export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Login page has no sidebar
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
