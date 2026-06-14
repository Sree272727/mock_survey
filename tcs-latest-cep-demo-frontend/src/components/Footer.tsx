export default function Footer() {
  return (
    <footer className="border-t border-gray-200/50 bg-white">
      <div className="max-w-[1360px] mx-auto px-8 py-4 text-[12px] text-gray-400 text-center">
        &copy; {new Date().getFullYear()} The Compliance Store
      </div>
    </footer>
  );
}
