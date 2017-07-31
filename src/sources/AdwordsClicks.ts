import { EtlBatch, EtlState } from '../EtlBatch';
import { AdwordsKeywords } from './AdwordsKeywords';

export class AdwordsClicks extends AdwordsKeywords {
  protected query = `SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId,
  CriteriaParameters, CriteriaId, KeywordMatchType, AdFormat, CreativeId, Device, Date, GclId, Clicks,
  ClickType, ExternalCustomerId, Page, Slot
  FROM   CLICK_PERFORMANCE_REPORT
  DURING `;
}
