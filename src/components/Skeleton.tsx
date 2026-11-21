export default function Skeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 md:px-6">
          <p className="text-[18px] font-semibold">BayseBonds</p>
          <div className="skeleton h-3 w-28" />
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-6">
        <div className="skeleton h-[110px] w-[70%] max-w-md md:h-[180px]" />
        <div className="mt-8 space-y-0">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-14 items-center border-b border-hairline">
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
