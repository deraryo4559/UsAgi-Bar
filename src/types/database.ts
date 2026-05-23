import type { InventoryItem } from './inventory';
import type {
  CocktailIngredient,
  CocktailRecipe,
  IngredientAlias,
  RecipeMatchStatus,
} from './recipes';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = 'admin' | 'viewer';

export type Profile = {
  id: string;
  user_id: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type RecipeMatchRow = {
  id: string;
  inventory_item_id: string;
  recipe_id: string;
  match_status: RecipeMatchStatus;
  missing_ingredients: Json | null;
  created_at: string;
  updated_at: string;
};

type Insert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type Update<T> = Partial<Insert<T>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insert<Profile>;
        Update: Update<Profile>;
        Relationships: [];
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Insert<InventoryItem>;
        Update: Update<InventoryItem>;
        Relationships: [];
      };
      cocktail_recipes: {
        Row: CocktailRecipe;
        Insert: Insert<CocktailRecipe>;
        Update: Update<CocktailRecipe>;
        Relationships: [];
      };
      cocktail_ingredients: {
        Row: CocktailIngredient;
        Insert: Insert<CocktailIngredient>;
        Update: Update<CocktailIngredient>;
        Relationships: [];
      };
      ingredient_aliases: {
        Row: IngredientAlias;
        Insert: Omit<IngredientAlias, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<
          Omit<IngredientAlias, 'id' | 'created_at'> & {
            id?: string;
            created_at?: string;
          }
        >;
        Relationships: [];
      };
      recipe_matches: {
        Row: RecipeMatchRow;
        Insert: Insert<RecipeMatchRow>;
        Update: Update<RecipeMatchRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
