export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'admin' | 'member'
          invited_email: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'admin' | 'member'
          invited_email?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          invited_email?: string | null
          joined_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          color: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          color?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          color?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      boards: {
        Row: {
          id: string
          project_id: string
          name: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          board_id: string
          project_id: string
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: string
          assignee_id: string | null
          due_date: string | null
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          project_id: string
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: string
          assignee_id?: string | null
          due_date?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          project_id?: string
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: string
          assignee_id?: string | null
          due_date?: string | null
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          stage: 'lead' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost'
          notes: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          stage?: 'lead' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost'
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          stage?: 'lead' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost'
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          contact_id: string
          organization_id: string
          title: string
          value: number | null
          stage: string
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          organization_id: string
          title: string
          value?: number | null
          stage?: string
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          organization_id?: string
          title?: string
          value?: number | null
          stage?: string
          closed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          type: 'event' | 'task' | 'followup'
          related_task_id: string | null
          related_contact_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          start_date: string
          end_date?: string | null
          type?: 'event' | 'task' | 'followup'
          related_task_id?: string | null
          related_contact_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          type?: 'event' | 'task' | 'followup'
          related_task_id?: string | null
          related_contact_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          id: string
          user_id: string
          duration_minutes: number
          type: 'focus' | 'break'
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          duration_minutes: number
          type: 'focus' | 'break'
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          duration_minutes?: number
          type?: 'focus' | 'break'
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_org_admin: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Membership = Database['public']['Tables']['memberships']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Board = Database['public']['Tables']['boards']['Row'] & { tasks?: Task[] }
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  assignee?: Profile | null
  creator?: Profile | null
  comments?: Comment[]
}
export type Comment = Database['public']['Tables']['comments']['Row'] & {
  user?: Profile | null
}
export type CrmContact = Database['public']['Tables']['crm_contacts']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type Message = Database['public']['Tables']['messages']['Row'] & {
  user?: Profile | null
}
export type CalendarEvent = Database['public']['Tables']['events']['Row']
