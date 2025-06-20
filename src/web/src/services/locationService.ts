export interface LocationData {
    latitude: number;
    longitude: number;
    timezone: string;
    city?: string;
    country?: string;
}

export interface LocationServiceOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
}

class LocationService {
    private cachedLocation: LocationData | null = null;
    private isLoading = false;
    private callbacks: ((location: LocationData | null) => void)[] = [];

    /**
     * Get the current location with timezone information
     */
    async getCurrentLocation(options?: LocationServiceOptions): Promise<LocationData | null> {
        // Return cached location if available
        if (this.cachedLocation) {
            return this.cachedLocation;
        }

        // If already loading, return a promise that resolves when loading completes
        if (this.isLoading) {
            return new Promise((resolve) => {
                this.callbacks.push(resolve);
            });
        }

        this.isLoading = true;

        try {
            // Check if geolocation is supported
            if (!navigator.geolocation) {
                console.warn('Geolocation is not supported by this browser.');
                this.notifyCallbacks(null);
                return null;
            }

            // Get position from browser
            const position = await this.getPosition(options);
            
            // Get timezone and location details
            const locationData = await this.getLocationDetails(
                position.coords.latitude,
                position.coords.longitude
            );

            this.cachedLocation = locationData;
            this.notifyCallbacks(locationData);
            return locationData;

        } catch (error) {
            console.error('Error getting location:', error);
            this.notifyCallbacks(null);
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get the cached location if available
     */
    getCachedLocation(): LocationData | null {
        return this.cachedLocation;
    }

    /**
     * Clear the cached location
     */
    clearCache(): void {
        this.cachedLocation = null;
    }

    /**
     * Get current timezone (fallback to browser timezone)
     */
    getCurrentTimezone(): string {
        if (this.cachedLocation?.timezone) {
            return this.cachedLocation.timezone;
        }
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    /**
     * Get position using browser geolocation API
     */
    private getPosition(options?: LocationServiceOptions): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: options?.enableHighAccuracy ?? true,
                    timeout: options?.timeout ?? 10000,
                    maximumAge: options?.maximumAge ?? 300000, // 5 minutes
                }
            );
        });
    }

    /**
     * Get location details including timezone from coordinates
     */
    private async getLocationDetails(latitude: number, longitude: number): Promise<LocationData> {
        try {
            // Try to get timezone using a free API
            const response = await fetch(
                `https://api.bigdatacloud.net/data/timezone-by-location?latitude=${latitude}&longitude=${longitude}&key=`
            );
            
            if (response.ok) {
                const data = await response.json();
                return {
                    latitude,
                    longitude,
                    timezone: data.ianaTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    city: data.localityName,
                    country: data.countryName,
                };
            }
        } catch (error) {
            console.warn('Failed to get timezone from API:', error);
        }

        // Fallback to browser timezone
        return {
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    /**
     * Notify all waiting callbacks
     */
    private notifyCallbacks(location: LocationData | null): void {
        this.callbacks.forEach(callback => callback(location));
        this.callbacks = [];
    }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;
