import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TimeClockService } from '../time-clock/time-clock.service';
import { EmployeesService } from '../employees/employees.service';
import { RoutesService } from '../routes/routes.service';
import { SupermarketsService } from '../supermarkets/supermarkets.service';
import { ImageAnalysisService } from '../integrations/image-analysis/image-analysis.service';

interface OfflineAction {
  type: 'CHECK_IN' | 'CHECK_OUT' | 'TIME_CLOCK' | 'PHOTO' | 'FORM_SUBMISSION';
  payload: any;
  timestamp: string;
  id: string; // Local ID
}

@Injectable()
export class AppSyncService {
  private readonly logger = new Logger(AppSyncService.name);

  constructor(
    private timeClockService: TimeClockService,
    private employeesService: EmployeesService,
    private routesService: RoutesService,
    private supermarketsService: SupermarketsService,
    private imageAnalysisService: ImageAnalysisService,
  ) {}

  /**
   * Process a batch of actions performed offline
   */
  async processOfflineActions(userId: string, data: { actions: OfflineAction[] }) {
    this.logger.log(`Processing ${data.actions.length} offline actions for user ${userId}`);
    
    const results = [];

    // Sort actions by timestamp to ensure correct order
    const actions = data.actions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const action of actions) {
      try {
        let result = null;
        switch (action.type) {
          case 'TIME_CLOCK':
            result = await this.handleTimeClock(action.payload);
            break;
          case 'CHECK_IN':
            result = await this.handleCheckIn(action.payload);
            break;
          // Add other handlers
        }
        results.push({ id: action.id, status: 'success', data: result });
      } catch (error) {
        this.logger.error(`Error processing action ${action.id}:`, error);
        results.push({ id: action.id, status: 'error', error: error.message });
      }
    }

    return { results };
  }

  /**
   * Handle Time Clock Event (Entry, Exit, Lunch)
   * Includes Facial Verification logic
   */
  private async handleTimeClock(payload: any) {
    const { employeeId, facialPhotoUrl, latitude, longitude } = payload;
    
    // 1. Verify Face if photo is provided
    let validationStatus = 'approved';
    let validationReason = 'Auto-approved';

    if (facialPhotoUrl) {
        const employee = await this.employeesService.findOne(employeeId);
        if (employee && employee.facialPhotoUrl) {
            const verification = await this.imageAnalysisService.verifyFace(facialPhotoUrl, employee.facialPhotoUrl);
            if (!verification.isMatch) {
                validationStatus = 'suspect';
                validationReason = `Face mismatch (Confidence: ${verification.confidence})`;
            }
        }
    }

    // 2. Create Event
    return this.timeClockService.create({
        ...payload,
        validationStatus,
        validationReason
    });
  }

  /**
   * Handle Route Check-in with Geo-fencing
   */
  private async handleCheckIn(payload: any) {
    const { routeItemId, latitude, longitude, supermarketId } = payload;
    
    const supermarket = await this.supermarketsService.findOne(supermarketId);
    if (!supermarket) throw new BadRequestException('Supermarket not found');

    if (supermarket.latitude && supermarket.longitude && latitude && longitude) {
        const distance = this.calculateDistance(latitude, longitude, Number(supermarket.latitude), Number(supermarket.longitude));
        if (distance > 300) { // 300 meters
             throw new BadRequestException(`Check-in rejected. Too far from store (${Math.round(distance)}m)`);
        }
    }

    // Update Route Item status
    // Note: You'll need to expose a method in RoutesService to update Item Status specifically
    // For now we assume a generic update or we need to add it to RoutesService
    return { success: true, distance: 'valid' }; 
  }

  /**
   * Haversine formula to calculate distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Fetch updates for the app (Routes, Messages, etc.)
   */
  async fetchUpdates(userId: string, lastSync: string) {
      // This would query DB for records updated > lastSync
      // For now, return full week schedule for the user
      // We need to resolve Employee ID from User ID first (this logic belongs in UsersService usually)
      
      // Stub implementation
      return {
          timestamp: new Date().toISOString(),
          routes: [], // fetch from RoutesService
          messages: []
      };
  }
}
