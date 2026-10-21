// Tiêu đề trang quản trị: tên trang bên trái, các nút hành động bên phải.
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="admin-page__header">
      <div>
        <h1 className="admin-page__title">{title}</h1>
        {subtitle && <p className="admin-page__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="button-group">{actions}</div>}
    </div>
  );
}
