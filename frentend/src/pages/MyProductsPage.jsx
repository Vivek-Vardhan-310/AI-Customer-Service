import Icon from '../components/ui/Icon';
import { MOCK_PRODUCTS } from '../data/products';

export default function MyProductsPage({ onSelectProduct }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Products</h1>
          <p>Track your registered devices</p>
        </div>
        <button className="btn-primary"><Icon name="plus" size={18} /><span>Add Product</span></button>
      </div>
      <div className="products-search">
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search your devices" />
      </div>
      {MOCK_PRODUCTS.map(product => (
        <div key={product.id} className="product-card" onClick={() => onSelectProduct(product)}>
          <img src={product.image} alt={product.name} className="product-card-img" />
          <div className="product-card-info">
            <div className="product-card-name">{product.name}</div>
            <div className="product-card-serial">Serial No: {product.serial}</div>
            <div className="product-card-badges">
              <span className={`badge ${product.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.warranty}</span>
              {product.amc !== 'Inactive' && <span className={`badge ${product.amc === 'Active' ? 'badge-green' : 'badge-amber'}`}>AMC {product.amc}</span>}
            </div>
          </div>
          <Icon name="chevron-right" size={20} color="#8a8a8a" />
        </div>
      ))}
    </div>
  );
}
