import type { Schema, Struct } from '@strapi/strapi';

export interface FlexCash extends Struct.ComponentSchema {
  collectionName: 'components_flex_cash';
  info: {
    displayName: 'cash';
  };
  attributes: {
    amount: Schema.Attribute.Float;
    date: Schema.Attribute.DateTime;
  };
}

export interface FlexFlex extends Struct.ComponentSchema {
  collectionName: 'components_flex_flexes';
  info: {
    displayName: 'size';
    icon: 'book';
  };
  attributes: {
    height: Schema.Attribute.Float;
    instruction: Schema.Attribute.Text;
    material: Schema.Attribute.String;
    per_piece_amount: Schema.Attribute.Float;
    per_piece_total: Schema.Attribute.Float;
    piece_count: Schema.Attribute.Float;
    sq_ft_price: Schema.Attribute.Float;
    type: Schema.Attribute.String;
    width: Schema.Attribute.Float;
  };
}

export interface FlexGpay extends Struct.ComponentSchema {
  collectionName: 'components_flex_gpays';
  info: {
    displayName: 'gpay';
  };
  attributes: {
    amount: Schema.Attribute.Float;
    date: Schema.Attribute.DateTime;
  };
}

export interface FlexInstruction extends Struct.ComponentSchema {
  collectionName: 'components_flex_instructions';
  info: {
    displayName: 'instruction';
  };
  attributes: {
    instruction: Schema.Attribute.Text;
    per_piece_amount: Schema.Attribute.Float;
    per_piece_total: Schema.Attribute.Float;
    piece_count: Schema.Attribute.BigInteger;
  };
}

export interface FlexMaterial extends Struct.ComponentSchema {
  collectionName: 'components_flex_materials';
  info: {
    displayName: 'material';
  };
  attributes: {
    material: Schema.Attribute.Enumeration<
      [
        'Shine',
        'Shine 3pass',
        'Star',
        'vinyl',
        'vinyl + lamination',
        'Backlight',
        'Backlight 2bl depth',
        'Eco vinyl',
        'Eco vinyl + lamination',
        'Eco star',
        'Eco Backlight',
        'Uv Star',
        'Uv Star (full black)',
        'Uv vinyl',
        'Uv vinyl (full black)',
        'Uv Backlight',
        'Uv Backlight (full black)',
        'Reflect Flex',
        'Reflect Vinyl',
        'Standee + star FLex',
        'Standee + normal FLex',
        'Sunpack Sheets ',
        'Foarm uv (3mm)',
        'Foarm uv(4 mm)',
        'Foarm uv(5mm)',
        'Foarm + vinyl + lamin(3 mm)',
        'Foarm + vinyl + lamin(5 mm)',
        'Foarm + uv vinyl + lamin(3 mm)',
        'Foarm + uv vinyl + lamin(5 mm)',
        'Frame + shine + pasting',
        'Frame + star + pasting',
        'Frame + backlight + pasting',
      ]
    >;
  };
}

export interface ParticularsParticulars extends Struct.ComponentSchema {
  collectionName: 'components_particulars_particulars';
  info: {
    displayName: 'particulars';
  };
  attributes: {
    text: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'flex.cash': FlexCash;
      'flex.flex': FlexFlex;
      'flex.gpay': FlexGpay;
      'flex.instruction': FlexInstruction;
      'flex.material': FlexMaterial;
      'particulars.particulars': ParticularsParticulars;
    }
  }
}
