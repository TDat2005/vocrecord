import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { api, NETWORK_ERROR } from '../../utils/api';
import { PageHeader } from './PageHeader';
import { ProductForm } from './ProductForm';

export function ProductCreate() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  // Đổi key để làm trống form sau khi thêm thành công.
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const data = await api.post('/products', values);
      if (data.success) {
        toast.success(`Đã thêm sản phẩm "${values.title}"`);
        setFormKey((key) => key + 1);
      } else {
        toast.error(data.message || 'Không thể thêm sản phẩm');
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Thêm sản phẩm" subtitle="Sản phẩm mới sẽ hiển thị ngay trên cửa hàng." />
      <ProductForm key={formKey} submitLabel="Lưu sản phẩm" submitting={submitting} onSubmit={handleSubmit} />
    </>
  );
}
