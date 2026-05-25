import { getDashboardContext } from '@/stores/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function ensurePluginRuntime() {
  ;(window as any).MiraDashboard = getDashboardContext()
  ;(window as any).MiraDashboardUI = {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ScrollArea,
    Separator,
  }
}
