import { JobType } from '../../types/CharacterTypes';
import { JobClass } from './JobClass';
import { WindNinja } from './WindNinja';
import { IronNinja } from './IronNinja';
import { ShadowNinja } from './ShadowNinja';
import { MedicineNinja } from './MedicineNinja';

export class JobFactory {
  private static readonly jobClasses = new Map<JobType, new() => JobClass>([
    ['wind' as JobType, WindNinja],
    ['iron' as JobType, IronNinja],
    ['shadow' as JobType, ShadowNinja],
    ['medicine' as JobType, MedicineNinja]
  ]);
  
  static createJob(type: JobType): JobClass {
    const JobConstructor = this.jobClasses.get(type);
    if (!JobConstructor) {
      throw new Error(`Unknown job type: ${type}`);
    }
    return new JobConstructor();
  }
  
  static getAllJobTypes(): JobType[] {
    return Array.from(this.jobClasses.keys());
  }
}