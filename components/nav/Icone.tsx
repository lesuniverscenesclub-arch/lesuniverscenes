import {
  BookOpen,
  ChartColumn,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  Download,
  FileText,
  FolderArchive,
  House,
  KeyRound,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  SquareCheckBig,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IconeNav } from "@/lib/roles";

const ICONES: Record<IconeNav, LucideIcon> = {
  accueil: House,
  planning: CalendarDays,
  taches: SquareCheckBig,
  chat: MessageSquare,
  guichet: FileText,
  profil: User,
  analytics: ChartColumn,
  evenements: CalendarPlus,
  assigner: UserPlus,
  valider: ShieldCheck,
  appel: ClipboardCheck,
  export: Download,
  codes: KeyRound,
  archives: FolderArchive,
  actualites: Newspaper,
  guide: BookOpen,
  membres: Users,
};

export function Icone({ nom, size = 18 }: { nom: IconeNav; size?: number }) {
  const C = ICONES[nom];
  return <C size={size} strokeWidth={1.8} aria-hidden />;
}
