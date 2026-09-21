export type Stage =
  | "lead"
  | "discovery"
  | "scoping"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost"

export type CommitmentOwner = "rep" | "client" | "presales" | "manager"
export type CommitmentStatus = "open" | "in_progress" | "done" | "overdue"
export type MeetingSource = "teams" | "simulated" | "manual" | "seed"

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          industry: string | null
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          company_id: string | null
          name: string
          role: string | null
          email: string | null
          is_champion: boolean
          is_economic_buyer: boolean
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          role?: string | null
          email?: string | null
          is_champion?: boolean
          is_economic_buyer?: boolean
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          role?: string | null
          email?: string | null
          is_champion?: boolean
          is_economic_buyer?: boolean
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          title: string
          company_id: string | null
          rep_id: string | null
          stage: Stage
          value: number | null
          next_meeting: string | null
          days_in_stage: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          company_id?: string | null
          rep_id?: string | null
          stage: Stage
          value?: number | null
          next_meeting?: string | null
          days_in_stage?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          company_id?: string | null
          rep_id?: string | null
          stage?: Stage
          value?: number | null
          next_meeting?: string | null
          days_in_stage?: number
          created_at?: string
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          id: string
          deal_id: string
          transcript_text: string
          source: MeetingSource
          meeting_date: string
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          transcript_text: string
          source: MeetingSource
          meeting_date?: string
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          transcript_text?: string
          source?: MeetingSource
          meeting_date?: string
          processed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          id: string
          deal_id: string
          agreed_text: string
          next_steps: string | null
          handoff_notes: string | null
          owner: CommitmentOwner | null
          deadline: string | null
          status: CommitmentStatus
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          agreed_text: string
          next_steps?: string | null
          handoff_notes?: string | null
          owner?: CommitmentOwner | null
          deadline?: string | null
          status?: CommitmentStatus
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          agreed_text?: string
          next_steps?: string | null
          handoff_notes?: string | null
          owner?: CommitmentOwner | null
          deadline?: string | null
          status?: CommitmentStatus
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      briefs: {
        Row: {
          id: string
          deal_id: string
          summary: string
          suggestions: string[]
          context_tags: { label: string; category: string }[]
          risk_flags: string[]
          generated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          summary: string
          suggestions?: string[]
          context_tags?: { label: string; category: string }[]
          risk_flags?: string[]
          generated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          summary?: string
          suggestions?: string[]
          context_tags?: { label: string; category: string }[]
          risk_flags?: string[]
          generated_at?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          id: string
          deal_id: string
          content: string
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          content: string
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          content?: string
          embedding?: number[]
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
