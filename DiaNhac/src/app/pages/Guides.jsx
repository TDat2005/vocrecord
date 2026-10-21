import { ArticleList } from '../components/ArticleList';
import { GUIDE_CATEGORIES } from '../data/articles';

export function Guides() {
  return (
    <ArticleList
      type="huongdan"
      title="Hướng dẫn"
      description="Quy trình từng bước để chọn, lắp đặt, vệ sinh và sử dụng bộ dàn vinyl an toàn."
      baseCategories={GUIDE_CATEGORIES}
      detailPath="/guide"
    />
  );
}
