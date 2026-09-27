import type { Schema, Struct } from '@strapi/strapi';

export interface SharedBranch extends Struct.ComponentSchema {
  collectionName: 'components_shared_branches';
  info: {
    displayName: 'Branch';
  };
  attributes: {
    label: Schema.Attribute.String;
    location: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<
        'plugin::cascading-select.cascading-select',
        {
          childUid: 'api::island.island';
          parentUid: 'api::atoll.atoll';
        }
      >;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'shared.branch': SharedBranch;
    }
  }
}
