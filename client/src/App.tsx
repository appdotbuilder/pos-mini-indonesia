
import { useState, useEffect, useCallback, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Package, Users, BarChart3, Calculator, Wallet, AlertTriangle, Search, Plus, Minus } from 'lucide-react';
// Type imports
import type { 
  Product, 
  CreateTransactionInput, 
  CreateProductInput, 
  CreateUserInput, 
  CreateStockMovementInput, 
  CreateCashDrawerInput, 
  ReportPeriodInput,
  StockMovement,
  CashDrawer,
  User,
  SalesReport,
  TopProduct
} from '../../server/src/schema';

// POS Interface Component
function POSInterface() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    isDigital: boolean;
  }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'digital'>('tunai');
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Gagal memuat produk:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((product: Product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.barcode && product.barcode.includes(searchTerm))
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product, isDigital: boolean = false) => {
    setCart((prev: Array<{product: Product; quantity: number; isDigital: boolean}>) => {
      const existingItem = prev.find(item => item.product.id === product.id && item.isDigital === isDigital);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id && item.isDigital === isDigital
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, isDigital }];
    });
  };

  const removeFromCart = (productId: number, isDigital: boolean) => {
    setCart((prev: Array<{product: Product; quantity: number; isDigital: boolean}>) =>
      prev.filter(item => !(item.product.id === productId && item.isDigital === isDigital))
    );
  };

  const updateQuantity = (productId: number, isDigital: boolean, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, isDigital);
      return;
    }
    setCart((prev: Array<{product: Product; quantity: number; isDigital: boolean}>) =>
      prev.map(item =>
        item.product.id === productId && item.isDigital === isDigital
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
  }, [cart]);

  const changeAmount = useMemo(() => {
    return paymentMethod === 'tunai' ? Math.max(0, paymentReceived - totalAmount) : 0;
  }, [paymentMethod, paymentReceived, totalAmount]);

  const processTransaction = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'tunai' && paymentReceived < totalAmount) {
      alert('Pembayaran tidak mencukupi!');
      return;
    }

    setIsProcessing(true);
    try {
      const transactionData: CreateTransactionInput = {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          is_digital_sale: item.isDigital
        })),
        payment_method: paymentMethod,
        payment_received: paymentMethod === 'tunai' ? paymentReceived : null,
        notes: null
      };

      await trpc.createTransaction.mutate(transactionData);
      
      // Reset form
      setCart([]);
      setPaymentReceived(0);
      setSearchTerm('');
      loadProducts(); // Refresh products to update stock
      
      alert('Transaksi berhasil diproses!');
    } catch (error) {
      console.error('Gagal memproses transaksi:', error);
      alert('Terjadi kesalahan saat memproses transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen p-4">
      {/* Product Search & List */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Cari Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Cari produk (nama, SKU, barcode)..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm">{product.name}</h3>
                        <Badge variant={product.type === 'fisik' ? 'default' : 'secondary'}>
                          {product.type === 'fisik' ? '📦 Fisik' : '💾 Digital'}
                        </Badge>
                      </div>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold text-green-600">
                          Rp {product.selling_price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Stok: {product.stock_quantity}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addToCart(product, false)}
                          disabled={product.type === 'fisik' && product.stock_quantity <= 0}
                          className="flex-1"
                        >
                          {product.type === 'fisik' ? '📦 Fisik' : '💾 Fisik'}
                        </Button>
                        {product.type === 'digital' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart(product, true)}
                            className="flex-1"
                          >
                            💳 Digital
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cart & Checkout */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 mb-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keranjang kosong
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div key={`${item.product.id}-${item.isDigital}-${index}`} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.isDigital ? '💳 Digital' : '📦 Fisik'} - Rp {item.product.selling_price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.isDigital, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.isDigital, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>

              <Select value={paymentMethod} onValueChange={(value: 'tunai' | 'digital') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Metode Pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunai">💰 Tunai</SelectItem>
                  <SelectItem value="digital">💳 Digital</SelectItem>
                </SelectContent>
              </Select>

              {paymentMethod === 'tunai' && (
                <>
                  <Input
                    type="number"
                    placeholder="Jumlah uang diterima"
                    value={paymentReceived || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setPaymentReceived(parseFloat(e.target.value) || 0)
                    }
                  />
                  {paymentReceived > 0 && (
                    <div className="flex justify-between">
                      <span>Kembalian:</span>
                      <span className="font-semibold">
                        Rp {changeAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </>
              )}

              <Button
                onClick={processTransaction}
                disabled={cart.length === 0 || isProcessing || (paymentMethod === 'tunai' && paymentReceived < totalAmount)}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Memproses...' : '🧾 Proses Transaksi'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Product Management Component
function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    sku: null,
    barcode: null,
    type: 'fisik',
    category: null,
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_alert: null
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Gagal memuat produk:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newProduct = await trpc.createProduct.mutate(formData);
      setProducts((prev: Product[]) => [...prev, newProduct]);
      setFormData({
        name: '',
        sku: null,
        barcode: null,
        type: 'fisik',
        category: null,
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        min_stock_alert: null
      });
      alert('Produk berhasil ditambahkan!');
    } catch (error) {
      console.error('Gagal menambah produk:', error);
      alert('Gagal menambahkan produk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Produk Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Nama Produk *"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              placeholder="SKU (opsional)"
              value={formData.sku || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value || null }))
              }
            />
            <Input
              placeholder="Barcode (opsional)"
              value={formData.barcode || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, barcode: e.target.value || null }))
              }
            />
            <Select
              value={formData.type}
              onValueChange={(value: 'fisik' | 'digital') =>
                setFormData((prev: CreateProductInput) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe Produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisik">📦 Produk Fisik</SelectItem>
                <SelectItem value="digital">💾 Produk Digital</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Kategori (opsional)"
              value={formData.category || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, category: e.target.value || null }))
              }
            />
            <Input
              type="number"
              placeholder="Harga Modal *"
              value={formData.cost_price || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))
              }
              min="0"
              step="0.01"
              required
            />
            <Input
              type="number"
              placeholder="Harga Jual *"
              value={formData.selling_price || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))
              }
              min="0"
              step="0.01"
              required
            />
            <Input
              type="number"
              placeholder="Jumlah Stok Awal *"
              value={formData.stock_quantity || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
              }
              min="0"
              required
            />
            <Input
              type="number"
              placeholder="Alert Stok Minimum (opsional)"
              value={formData.min_stock_alert || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateProductInput) => ({ ...prev, min_stock_alert: parseInt(e.target.value) || null }))
              }
              min="0"
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Menambahkan...' : '➕ Tambah Produk'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Daftar Produk ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {products.map((product: Product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{product.name}</h3>
                        <Badge variant={product.type === 'fisik' ? 'default' : 'secondary'}>
                          {product.type === 'fisik' ? '📦' : '💾'}
                        </Badge>
                        {product.stock_quantity <= (product.min_stock_alert || 0) && product.min_stock_alert && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Stok Rendah
                          </Badge>
                        )}
                      </div>
                      {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                      {product.category && <p className="text-sm text-muted-foreground">Kategori: {product.category}</p>}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Modal: Rp {product.cost_price.toLocaleString('id-ID')}</span>
                        <span className="text-green-600 font-medium">
                          Jual: Rp {product.selling_price.toLocaleString('id-ID')}
                        </span>
                        <span>Stok: {product.stock_quantity}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Stock Management Component
function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movementType, setMovementType] = useState<'masuk' | 'keluar' | 'opname'>('masuk');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [productsResult, movementsResult] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getStockMovements.query()
      ]);
      setProducts(productsResult);
      setStockMovements(movementsResult);
    } catch (error) {
      console.error('Gagal memuat data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setIsLoading(true);
    try {
      const movementData: CreateStockMovementInput = {
        product_id: parseInt(selectedProductId),
        type: movementType,
        quantity: quantity,
        notes: notes || null
      };

      await trpc.createStockMovement.mutate(movementData);
      
      // Reset form
      setSelectedProductId('');
      setQuantity(0);
      setNotes('');
      
      // Reload data
      loadData();
      
      alert('Pergerakan stok berhasil dicatat!');
    } catch (error) {
      console.error('Gagal mencatat pergerakan stok:', error);
      alert('Gagal mencatat pergerakan stok');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catat Pergerakan Stok
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              value={selectedProductId}
              onValueChange={(value: string) => setSelectedProductId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Produk" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.type === 'fisik').map((product: Product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} (Stok: {product.stock_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={movementType}
              onValueChange={(value: 'masuk' | 'keluar' | 'opname') => setMovementType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe Pergerakan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masuk">📈 Barang Masuk</SelectItem>
                <SelectItem value="keluar">📉 Barang Keluar</SelectItem>
                <SelectItem value="opname">📊 Stock Opname</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Jumlah"
              value={quantity || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              required
            />

            <Input
              placeholder="Catatan (opsional)"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
            />

            <Button type="submit" disabled={!selectedProductId || quantity <= 0 || isLoading} className="w-full">
              {isLoading ? 'Menyimpan...' : '📝 Catat Pergerakan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pergerakan Stok</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {stockMovements.map((movement: StockMovement, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Produk ID: {movement.product_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {movement.type === 'masuk' ? '📈' : movement.type === 'keluar' ? '📉' : '📊'}{' '}
                      {movement.type} - {movement.quantity} unit
                    </p>
                    {movement.notes && (
                      <p className="text-xs text-muted-foreground">{movement.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p>Stok: {movement.previous_stock} → {movement.new_stock}</p>
                    <p className="text-muted-foreground">
                      {movement.created_at.toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Cash Drawer Management Component
function CashDrawerManagement() {
  const [entries, setEntries] = useState<CashDrawer[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [formData, setFormData] = useState<CreateCashDrawerInput>({
    type: 'masuk',
    amount: 0,
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [entriesResult, balanceResult] = await Promise.all([
        trpc.getCashDrawerEntries.query(),
        trpc.getCashDrawerBalance.query()
      ]);
      setEntries(entriesResult);
      setBalance(balanceResult.balance || 0);
    } catch (error) {
      console.error('Gagal memuat data cash drawer:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createCashDrawerEntry.mutate(formData);
      
      // Reset form
      setFormData({
        type: 'masuk',
        amount: 0,
        description: ''
      });
      
      // Reload data
      loadData();
      
      alert('Entri cash drawer berhasil dicatat!');
    } catch (error) {
      console.error('Gagal mencatat entri cash drawer:', error);
      alert('Gagal mencatat entri cash drawer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Saldo Kas Saat Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-center text-green-600">
            Rp {balance.toLocaleString('id-ID')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Catat Transaksi Kas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              value={formData.type}
              onValueChange={(value: 'masuk' | 'keluar' | 'saldo_awal') => 
                setFormData((prev: CreateCashDrawerInput) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe Transaksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masuk">💰 Uang Masuk</SelectItem>
                <SelectItem value="keluar">💸 Uang Keluar</SelectItem>
                <SelectItem value="saldo_awal">🏦 Saldo Awal</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Jumlah (Rp)"
              value={formData.amount || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateCashDrawerInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
              }
              min="0"
              step="0.01"
              required
            />

            <Input
              placeholder="Keterangan"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateCashDrawerInput) => ({ ...prev, description: e.target.value }))
              }
              required
            />

            <Button type="submit" disabled={formData.amount <= 0 || !formData.description || isLoading} className="w-full">
              {isLoading ? 'Menyimpan...' : '💾 Catat Transaksi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi Kas</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {entries.map((entry: CashDrawer, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.type === 'masuk' ? '💰' : entry.type === 'keluar' ? '💸' : '🏦'}{' '}
                      {entry.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${entry.type === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'masuk' ? '+' : '-'}Rp {entry.amount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.created_at.toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    full_name: '',
    password: '',
    role: 'kasir'
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Gagal memuat pengguna:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(formData);
      
      // Reset form
      setFormData({
        username: '',
        full_name: '',
        password: '',
        role: 'kasir'
      });
      
      // Reload users
      loadUsers();
      
      alert('Pengguna berhasil ditambahkan!');
    } catch (error) {
      console.error('Gagal menambah pengguna:', error);
      alert('Gagal menambahkan pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tambah Pengguna Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Username"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Nama Lengkap"
              value={formData.full_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
              }
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'kasir') =>
                setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">👑 Admin</SelectItem>
                <SelectItem value="kasir">👤 Kasir</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Menambahkan...' : '➕ Tambah Pengguna'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user: User, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="text-right">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? '👑 Admin' : '👤 Kasir'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reports Component
function Reports() {
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodInput>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [salesReport, setSalesReport] = useState<SalesReport[]>([]);
  const [profitReport, setProfitReport] = useState<{total_profit: number; total_revenue: number; profit_margin: number} | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesData, profitData, topProductsData] = await Promise.all([
        trpc.getSalesReport.query(reportPeriod),
        trpc.getProfitReport.query(reportPeriod),
        trpc.getTopProducts.query(reportPeriod)
      ]);
      setSalesReport(salesData);
      setProfitReport(profitData);
      setTopProducts(topProductsData);
    } catch (error) {
      console.error('Gagal memuat laporan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportPeriod]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filter Periode Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Input
                type="date"
                value={reportPeriod.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportPeriod((prev: ReportPeriodInput) => ({ ...prev, start_date: e.target.value }))
                }
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Tanggal Akhir</label>
              <Input
                type="date"
                value={reportPeriod.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportPeriod((prev: ReportPeriodInput) => ({ ...prev, end_date: e.target.value }))
                }
              />
            </div>
            <Button onClick={loadReports} disabled={isLoading}>
              {isLoading ? 'Memuat...' : '🔍 Tampilkan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📊 Laporan Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {salesReport.map((report: SalesReport, index: number) => (
                  <div key={index} className="p-3 border rounded">
                    <p className="font-medium">{report.date}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <span>Transaksi: {report.total_transactions}</span>
                      <span>Pendapatan: Rp {report.total_revenue.toLocaleString('id-ID')}</span>
                      <span>Fisik: Rp {report.physical_sales.toLocaleString('id-ID')}</span>
                      <span>Digital: Rp {report.digital_sales.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💰 Laporan Keuntungan</CardTitle>
          </CardHeader>
          <CardContent>
            {profitReport ? (
              <div className="space-y-4">
                <div className="p-4 border rounded">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Total Pendapatan:</span>
                      <span className="font-semibold text-blue-600">
                        Rp {profitReport.total_revenue.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Keuntungan:</span>
                      <span className="font-semibold text-green-600">
                        Rp {profitReport.total_profit.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margin Keuntungan:</span>
                      <span className="font-semibold text-purple-600">
                        {profitReport.profit_margin.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Data laporan keuntungan belum tersedia
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏆 Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {topProducts.map((product: TopProduct, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Terjual: {product.total_quantity} unit
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      Rp {product.total_revenue.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('pos');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">
              🏪 Sistem POS & Manajemen Toko
            </h1>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="container mx-auto">
        <TabsList className="grid w-full grid-cols-6 my-4">
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            POS
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produk
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stok
          </TabsTrigger>
          <TabsTrigger value="cash" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Kas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pengguna
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Laporan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-0">
          <POSInterface />
        </TabsContent>

        <TabsContent value="products" className="mt-0">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="stock" className="mt-0">
          <StockManagement />
        </TabsContent>

        <TabsContent value="cash" className="mt-0">
          <CashDrawerManagement />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
