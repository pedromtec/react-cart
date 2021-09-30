import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateCart = ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const updatedCart = cart.map(product => ({
      ...product, 
      amount: product.id === productId ? amount : product.amount 
    }))
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    setCart(updatedCart)
  }

  const hasNoStock = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const { data: stock } = await api.get<Stock>(`stock/${productId}`)
    return amount > stock.amount
  }

  const addProduct = async (productId: number) => {
    try {
      const productCart = cart.find(product => product.id === productId)

      const amount = productCart ? productCart.amount + 1 : 1

      if(await hasNoStock({ productId, amount })) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if(productCart) {
        updateCart({
          productId,
          amount
        })
        return
      }
    
      const  { data: product } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`)
      const updatedCart = [...cart, { ...product, amount }]
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      setCart(updatedCart)

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartHasProduct = cart.some(product => product.id === productId)
      if(!cartHasProduct) {
       throw new Error()
      }
      const updatedCart = cart.filter(product => product.id !== productId)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return
      }

      if(await hasNoStock({productId, amount})) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      updateCart({productId, amount})

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
