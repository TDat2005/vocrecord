import { ArticleList } from '../components/ArticleList';
import { BLOG_CATEGORIES } from '../data/articles';

export function Blog() {
  return (
    <ArticleList
      type="blog"
      title="Blog Vọc Records"
      description="Kiến thức, review và câu chuyện giúp bạn nghe, chọn và sưu tầm nhạc analog có chủ đích."
      baseCategories={BLOG_CATEGORIES}
      detailPath="/blog"
    />
  );
}
