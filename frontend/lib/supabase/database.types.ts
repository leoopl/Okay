export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database['public']['Enums']['audit_action'];
          details: Json | null;
          id: string;
          ip_address: unknown | null;
          resource: string;
          resource_id: string | null;
          timestamp: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: Database['public']['Enums']['audit_action'];
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          resource: string;
          resource_id?: string | null;
          timestamp?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: Database['public']['Enums']['audit_action'];
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          resource?: string;
          resource_id?: string | null;
          timestamp?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      breathing_techniques: {
        Row: {
          bgcolor: string;
          created_at: string;
          description: string;
          duration: number[];
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          bgcolor: string;
          created_at?: string;
          description: string;
          duration: number[];
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          bgcolor?: string;
          created_at?: string;
          description?: string;
          duration?: number[];
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dose_logs: {
        Row: {
          created_at: string;
          id: string;
          medication_id: string;
          notes: string | null;
          scheduled_time: string | null;
          status: Database['public']['Enums']['dose_status'];
          timestamp: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          medication_id: string;
          notes?: string | null;
          scheduled_time?: string | null;
          status?: Database['public']['Enums']['dose_status'];
          timestamp: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          medication_id?: string;
          notes?: string | null;
          scheduled_time?: string | null;
          status?: Database['public']['Enums']['dose_status'];
          timestamp?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dose_logs_medication_id_fkey';
            columns: ['medication_id'];
            isOneToOne: false;
            referencedRelation: 'medications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dose_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      inventories: {
        Row: {
          created_at: string;
          description: string;
          disclaimer: string | null;
          id: string;
          name: string;
          questions: Json;
          scoring: Json;
          source: string | null;
          title: string;
          updated_at: string;
          version: string | null;
        };
        Insert: {
          created_at?: string;
          description: string;
          disclaimer?: string | null;
          id?: string;
          name: string;
          questions: Json;
          scoring: Json;
          source?: string | null;
          title: string;
          updated_at?: string;
          version?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          disclaimer?: string | null;
          id?: string;
          name?: string;
          questions?: Json;
          scoring?: Json;
          source?: string | null;
          title?: string;
          updated_at?: string;
          version?: string | null;
        };
        Relationships: [];
      };
      inventory_responses: {
        Row: {
          calculated_scores: Json | null;
          completed_at: string;
          consent_given: boolean;
          deleted_at: string | null;
          id: string;
          interpretation_results: Json | null;
          inventory_id: string;
          ip_address: unknown | null;
          responses: Json;
          user_id: string;
        };
        Insert: {
          calculated_scores?: Json | null;
          completed_at?: string;
          consent_given?: boolean;
          deleted_at?: string | null;
          id?: string;
          interpretation_results?: Json | null;
          inventory_id: string;
          ip_address?: unknown | null;
          responses: Json;
          user_id: string;
        };
        Update: {
          calculated_scores?: Json | null;
          completed_at?: string;
          consent_given?: boolean;
          deleted_at?: string | null;
          id?: string;
          interpretation_results?: Json | null;
          inventory_id?: string;
          ip_address?: unknown | null;
          responses?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_responses_inventory_id_fkey';
            columns: ['inventory_id'];
            isOneToOne: false;
            referencedRelation: 'inventories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_responses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      journal_entries: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          is_content_encrypted: boolean;
          mood: Database['public']['Enums']['journal_mood'] | null;
          search_vector: unknown | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id?: string;
          is_content_encrypted?: boolean;
          mood?: Database['public']['Enums']['journal_mood'] | null;
          search_vector?: unknown | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          is_content_encrypted?: boolean;
          mood?: Database['public']['Enums']['journal_mood'] | null;
          search_vector?: unknown | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'journal_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      medications: {
        Row: {
          created_at: string;
          dosage: string;
          end_date: string | null;
          form: Database['public']['Enums']['medication_form'];
          id: string;
          instructions: string | null;
          name: string;
          notes: string | null;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dosage: string;
          end_date?: string | null;
          form?: Database['public']['Enums']['medication_form'];
          id?: string;
          instructions?: string | null;
          name: string;
          notes?: string | null;
          start_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dosage?: string;
          end_date?: string | null;
          form?: Database['public']['Enums']['medication_form'];
          id?: string;
          instructions?: string | null;
          name?: string;
          notes?: string | null;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      permissions: {
        Row: {
          action: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          resource: string;
          updated_at: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          resource: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          resource?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      professionals: {
        Row: {
          atendimento_prestado: string | null;
          cnes: number | null;
          complemento: string | null;
          convenio_sus: string | null;
          dt_comp: string | null;
          gestao: string | null;
          id: number;
          logradouro: string | null;
          municipio: string | null;
          natureza_juridica: string | null;
          nivel_atencao: string | null;
          nome_fantasia: string | null;
          profissional_atende_sus: boolean | null;
          profissional_cbo: string | null;
          profissional_cns: number | null;
          profissional_nome: string | null;
          profissional_vinculo: string | null;
          telefone: string | null;
          tipo_unidade: string | null;
          uf: string | null;
        };
        Insert: {
          atendimento_prestado?: string | null;
          cnes?: number | null;
          complemento?: string | null;
          convenio_sus?: string | null;
          dt_comp?: string | null;
          gestao?: string | null;
          id?: number;
          logradouro?: string | null;
          municipio?: string | null;
          natureza_juridica?: string | null;
          nivel_atencao?: string | null;
          nome_fantasia?: string | null;
          profissional_atende_sus?: boolean | null;
          profissional_cbo?: string | null;
          profissional_cns?: number | null;
          profissional_nome?: string | null;
          profissional_vinculo?: string | null;
          telefone?: string | null;
          tipo_unidade?: string | null;
          uf?: string | null;
        };
        Update: {
          atendimento_prestado?: string | null;
          cnes?: number | null;
          complemento?: string | null;
          convenio_sus?: string | null;
          dt_comp?: string | null;
          gestao?: string | null;
          id?: number;
          logradouro?: string | null;
          municipio?: string | null;
          natureza_juridica?: string | null;
          nivel_atencao?: string | null;
          nome_fantasia?: string | null;
          profissional_atende_sus?: boolean | null;
          profissional_cbo?: string | null;
          profissional_cns?: number | null;
          profissional_nome?: string | null;
          profissional_vinculo?: string | null;
          telefone?: string | null;
          tipo_unidade?: string | null;
          uf?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          birthdate: string | null;
          consent_to_data_processing: boolean;
          consent_to_marketing: boolean;
          consent_to_research: boolean;
          consent_updated_at: string | null;
          created_at: string;
          email: string;
          gender: Database['public']['Enums']['gender_type'] | null;
          id: string;
          name: string;
          profile_picture_updated_at: string | null;
          profile_picture_url: string | null;
          surname: string | null;
          updated_at: string;
        };
        Insert: {
          birthdate?: string | null;
          consent_to_data_processing?: boolean;
          consent_to_marketing?: boolean;
          consent_to_research?: boolean;
          consent_updated_at?: string | null;
          created_at?: string;
          email: string;
          gender?: Database['public']['Enums']['gender_type'] | null;
          id: string;
          name: string;
          profile_picture_updated_at?: string | null;
          profile_picture_url?: string | null;
          surname?: string | null;
          updated_at?: string;
        };
        Update: {
          birthdate?: string | null;
          consent_to_data_processing?: boolean;
          consent_to_marketing?: boolean;
          consent_to_research?: boolean;
          consent_updated_at?: string | null;
          created_at?: string;
          email?: string;
          gender?: Database['public']['Enums']['gender_type'] | null;
          id?: string;
          name?: string;
          profile_picture_updated_at?: string | null;
          profile_picture_url?: string | null;
          surname?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_default: boolean;
          is_system: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default?: boolean;
          is_system?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default?: boolean;
          is_system?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedule_times: {
        Row: {
          days: Database['public']['Enums']['day_of_week'][];
          id: string;
          medication_id: string;
          time: string;
        };
        Insert: {
          days: Database['public']['Enums']['day_of_week'][];
          id?: string;
          medication_id: string;
          time: string;
        };
        Update: {
          days?: Database['public']['Enums']['day_of_week'][];
          id?: string;
          medication_id?: string;
          time?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedule_times_medication_id_fkey';
            columns: ['medication_id'];
            isOneToOne: false;
            referencedRelation: 'medications';
            referencedColumns: ['id'];
          },
        ];
      };
      testimonials: {
        Row: {
          approved_at: string | null;
          approved_by_id: string | null;
          created_at: string;
          email: string;
          id: string;
          location: string | null;
          message: string;
          newsletter: boolean;
          status: Database['public']['Enums']['testimonial_status'];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          location?: string | null;
          message: string;
          newsletter?: boolean;
          status?: Database['public']['Enums']['testimonial_status'];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          location?: string | null;
          message?: string;
          newsletter?: boolean;
          status?: Database['public']['Enums']['testimonial_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'testimonials_approved_by_id_fkey';
            columns: ['approved_by_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          role_id: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_roles: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_admin_or_owner: {
        Args: { owner_id: string };
        Returns: boolean;
      };
      is_admin_user: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      search_journal_entries: {
        Args: {
          p_user_id: string;
          p_query?: string;
          p_mood?: Database['public']['Enums']['journal_mood'];
          p_tags?: string[];
          p_start_date?: string;
          p_end_date?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          content: Json;
          mood: Database['public']['Enums']['journal_mood'];
          tags: string[];
          is_content_encrypted: boolean;
          created_at: string;
          updated_at: string;
          rank: number;
        }[];
      };
      user_has_any_role: {
        Args: { role_names: string[] };
        Returns: boolean;
      };
      user_has_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
    };
    Enums: {
      audit_action:
        | 'create'
        | 'read'
        | 'update'
        | 'delete'
        | 'login'
        | 'logout'
        | 'failed_login'
        | 'profile_access'
        | 'data_export'
        | 'consent_updated'
        | 'sensitive_data_access'
        | 'password_updated'
        | 'account_deletion'
        | 'account_linked'
        | 'oauth_revoked'
        | 'token_refreshed'
        | 'token_refresh_failed'
        | 'session_terminated'
        | 'password_reset_request'
        | 'password_reset_success'
        | 'email_verification_request'
        | 'email_verified'
        | 'role_assigned'
        | 'role_removed'
        | 'permission_granted'
        | 'permission_revoked'
        | 'settings_updated'
        | 'account_merge_requested'
        | 'access_denied';
      day_of_week:
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday';
      dose_status: 'taken' | 'skipped' | 'delayed';
      gender_type: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';
      journal_mood:
        | 'happy'
        | 'sad'
        | 'excited'
        | 'anxious'
        | 'calm'
        | 'angry'
        | 'grateful'
        | 'confused'
        | 'proud'
        | 'tired'
        | 'neutral';
      medication_form: 'capsule' | 'tablet' | 'drops' | 'injectable' | 'ointment' | 'other';
      testimonial_status: 'pending' | 'approved' | 'rejected';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_action: [
        'create',
        'read',
        'update',
        'delete',
        'login',
        'logout',
        'failed_login',
        'profile_access',
        'data_export',
        'consent_updated',
        'sensitive_data_access',
        'password_updated',
        'account_deletion',
        'account_linked',
        'oauth_revoked',
        'token_refreshed',
        'token_refresh_failed',
        'session_terminated',
        'password_reset_request',
        'password_reset_success',
        'email_verification_request',
        'email_verified',
        'role_assigned',
        'role_removed',
        'permission_granted',
        'permission_revoked',
        'settings_updated',
        'account_merge_requested',
        'access_denied',
      ],
      day_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      dose_status: ['taken', 'skipped', 'delayed'],
      gender_type: ['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'],
      journal_mood: [
        'happy',
        'sad',
        'excited',
        'anxious',
        'calm',
        'angry',
        'grateful',
        'confused',
        'proud',
        'tired',
        'neutral',
      ],
      medication_form: ['capsule', 'tablet', 'drops', 'injectable', 'ointment', 'other'],
      testimonial_status: ['pending', 'approved', 'rejected'],
    },
  },
} as const;
