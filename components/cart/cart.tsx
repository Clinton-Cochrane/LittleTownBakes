'use client';

import {useState} from 'react';
import CartIcon from './cartIcon';
import CartDropdown from './cartDropdown';

export default function Cart() {
    const [open, setOpen] = useState(false);

    return (
        <div className='relative'>
            <button onClick={() => setOpen((o) => !o)}>
                <CartIcon />
            </button>
            {open && <CartDropdown />}
        </div>
    );
}