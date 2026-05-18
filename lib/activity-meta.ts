export const ACTION_META: Record<string, { icon: string; color: string; label: string }> = {
  listing_added:       { icon: '📦', color: '#f1641e', label: 'Thêm sản phẩm'    },
  listing_deleted:     { icon: '🗑️',  color: '#ef4444', label: 'Xóa sản phẩm'     },
  collection_created:  { icon: '📁', color: '#84cc16', label: 'Tạo bộ sưu tập'   },
  collection_deleted:  { icon: '🗑️',  color: '#ef4444', label: 'Xóa bộ sưu tập'   },
  snapshot_captured:   { icon: '📸', color: '#60a5fa', label: 'Cập nhật snapshot' },
};
