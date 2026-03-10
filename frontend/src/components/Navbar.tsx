export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="/" className="font-bold">Noctual AI</a>

        <nav className="flex gap-4 text-sm">
          <a className="hover:underline" href="/public">Public</a>
          <a className="hover:underline" href="/student">Student</a>
        </nav>
      </div>
    </header>
  );
}