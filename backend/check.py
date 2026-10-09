from app.config import get_settings
from app.repositories.factory import (
    build_stock_repository,
    build_customer_repository,
    build_transaction_repository,
    build_invoice_repository,
    build_business_repository,
    build_user_repository,
    build_extraction_repository,
    build_payment_repository,
    build_stock_movement_repository,
    build_password_reset_repository
)

settings = get_settings()
print('Testing instantation...')

try: build_stock_repository(settings); print('stock OK')
except Exception as e: print(f'stock FAILED: {e}')

try: build_customer_repository(settings); print('customer OK')
except Exception as e: print(f'customer FAILED: {e}')

try: build_transaction_repository(settings); print('transaction OK')
except Exception as e: print(f'transaction FAILED: {e}')

try: build_invoice_repository(settings); print('invoice OK')
except Exception as e: print(f'invoice FAILED: {e}')

try: build_business_repository(settings); print('business OK')
except Exception as e: print(f'business FAILED: {e}')

try: build_user_repository(settings); print('user OK')
except Exception as e: print(f'user FAILED: {e}')

try: build_extraction_repository(settings); print('extraction OK')
except Exception as e: print(f'extraction FAILED: {e}')

try: build_payment_repository(settings); print('payment OK')
except Exception as e: print(f'payment FAILED: {e}')

try: build_stock_movement_repository(settings); print('stock_movement OK')
except Exception as e: print(f'stock_movement FAILED: {e}')

try: build_password_reset_repository(settings); print('password_reset OK')
except Exception as e: print(f'password_reset FAILED: {e}')

print('Done!')
