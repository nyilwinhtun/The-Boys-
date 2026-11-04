import type { LucideIcon } from 'lucide-react'
import {
  BarChart3, Building2, ClipboardList, LayoutDashboard, Package,
  Settings, ShoppingCart, Truck,
  Users, Wallet, Warehouse,
} from 'lucide-react'

export type PageKey =
  | 'dashboard' | 'inventory' | 'pos' | 'purchases' | 'warehouse'
  | 'transfers' | 'customers' | 'accounts' | 'reports' | 'team' | 'settings'

export interface NavigationItem {
  key: PageKey
  label: string
  labelMy: string
  icon: LucideIcon
  group: 'main' | 'operations' | 'management'
}

export const navigation: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', labelMy: 'ပင်မစာမျက်နှာ', icon: LayoutDashboard, group: 'main' },
  { key: 'inventory', label: 'Inventory', labelMy: 'ပစ္စည်းစာရင်း', icon: Package, group: 'operations' },
  { key: 'pos', label: 'POS & Sales', labelMy: 'အရောင်း', icon: ShoppingCart, group: 'operations' },
  { key: 'purchases', label: 'Purchases', labelMy: 'ဝယ်ယူမှု', icon: ClipboardList, group: 'operations' },
  { key: 'warehouse', label: 'Warehouse', labelMy: 'ဂိုဒေါင်', icon: Warehouse, group: 'operations' },
  { key: 'transfers', label: 'Stock Transfers', labelMy: 'ပစ္စည်းလွှဲပြောင်းမှု', icon: Truck, group: 'operations' },
  { key: 'customers', label: 'Customers', labelMy: 'ဖောက်သည်', icon: Users, group: 'operations' },
  { key: 'accounts', label: 'Accounts', labelMy: 'ငွေစာရင်း', icon: Wallet, group: 'management' },
  { key: 'reports', label: 'Reports', labelMy: 'အစီရင်ခံစာ', icon: BarChart3, group: 'management' },
  { key: 'team', label: 'Team & Roles', labelMy: 'ဝန်ထမ်းနှင့် ခွင့်ပြုချက်', icon: Building2, group: 'management' },
  { key: 'settings', label: 'Settings', labelMy: 'ဆက်တင်', icon: Settings, group: 'management' },
]

export const groupLabels = {
  main: 'OVERVIEW',
  operations: 'OPERATIONS',
  management: 'MANAGEMENT',
} as const

export const mobileNavigation: PageKey[] = ['dashboard', 'inventory', 'pos', 'reports']
