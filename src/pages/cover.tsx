import { CoverGenerator } from '@/components/cover/cover-generator';
import { useTitle } from '@/lib/use-title';

export default function CoverPage() {
  useTitle('封面制作');

  return (
    <main className="container mx-auto max-w-[1920px] px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">封面制作</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <p>在线生成精美的封面图片</p>
        </div>
      </div>
      <CoverGenerator />
    </main>
  );
}
