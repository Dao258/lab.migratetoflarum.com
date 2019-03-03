<?php

namespace App;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Pdp\Rules;

/**
 * @property int $id
 * @property string $uid
 * @property string $normalized_url
 * @property string $canonical_url
 * @property string $name
 * @property string $last_rating
 * @property Carbon $last_public_scanned_at
 * @property boolean $ignore
 * @property array $showcase_meta
 * @property Carbon $created_at
 * @property Carbon $updated_at
 *
 * @property Collection|Scan[] $scans
 * @property bool $is_apex
 */
class Website extends UidModel
{
    protected $fillable = [
        'normalized_url',
    ];

    protected $casts = [
        'ignore' => 'boolean',
        'showcase_meta' => 'array',
    ];

    public function scans()
    {
        return $this->hasMany(Scan::class);
    }

    public function lastPubliclyVisibleScan()
    {
        return $this
            ->hasOne(Scan::class)
            ->publiclyVisible()
            ->orderBy('scanned_at', 'desc');
    }

    public function scopePubliclyVisible(Builder $query)
    {
        $query
            // TODO: can be replaced with simply ignore == 0 once most existing websites have been scanned again with an ignore check
            ->where(function ($query) {
                $query
                    ->whereNull('ignore')
                    ->orWhere('ignore', '=', 0);
            })
            ->whereNotNull('canonical_url')
            ->whereNotNull('last_public_scanned_at')
            ->whereNotNull('name');
    }

    public function getIsApexAttribute(): bool
    {
        /**
         * @var $rules Rules
         */
        $rules = app(Rules::class);

        $parsedUrl = parse_url("https://{$this->normalized_url}");

        $domain = $rules->resolve(array_get($parsedUrl, 'host'));

        return is_null($domain->getSubDomain());
    }
}
